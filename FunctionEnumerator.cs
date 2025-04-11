using System;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Linq;
using System.IO;
using System.Text;

namespace FunctionEnumerator
{
    public class FunctionEnumerator
    {

        [DllExport("GetMainFormInstance", CallingConvention = CallingConvention.StdCall)]
        public static IntPtr GetMainFormInstance()
        {
            try
            {
                // Get the MainForm instance from KeePass
                var mainWindowProperty = typeof(KeePass.Program).GetProperty("MainForm", BindingFlags.Public | BindingFlags.Static);
                var mainForm = mainWindowProperty.GetValue(null);

                // Return the pointer to the object
                if (mainForm != null)
                {
                    GCHandle handle = GCHandle.Alloc(mainForm, GCHandleType.Normal);
                    IntPtr pointer = GCHandle.ToIntPtr(handle);

                    // Note: This creates a GC handle that needs to be freed later
                    return pointer;
                }

                return IntPtr.Zero;
            }
            catch (Exception ex)
            {
                return IntPtr.Zero;
            }
        }

        [DllExport("EnumerateFunctions", CallingConvention = CallingConvention.StdCall)]
        public static IntPtr EnumerateFunctions(string assemblyPath)
        {
            // Original implementation remains the same
            var results = new List<string>();
            try
            {
                // Load the .NET assembly
                Assembly assembly = Assembly.LoadFrom(assemblyPath);

                // Get all types including nested types
                var types = assembly.GetTypes();
                foreach (var type in types)
                {
                    ProcessType(type, results);
                }
            }
            catch (Exception e)
            {
                return StringToHGlobalAnsiWithCleanup($"Error: {e.Message}");
            }

            // Join results and return as a single string
            return StringToHGlobalAnsiWithCleanup(string.Join("|", results));
        }

        [DllExport("WriteToCSV", CallingConvention = CallingConvention.StdCall)]
        public static IntPtr WriteToCSV(string assemblyPath, string outputDirectory)
        {
            try
            {
                // Load the .NET assembly
                Assembly assembly = Assembly.LoadFrom(assemblyPath);

                // Generate filename with EPOCH timestamp and executable name
                string executableName = Path.GetFileNameWithoutExtension(assemblyPath).ToLower();
                long epochTime = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds;
                string csvFileName = $"{epochTime}_{executableName}_functions_output.csv";

                // Combine with output directory
                string csvFilePath = Path.Combine(outputDirectory, csvFileName);

                // Create CSV headers
                string csvHeader = "ClassName,MethodName,MethodType,Signature,Address\n";
                StringBuilder csvContent = new StringBuilder(csvHeader);

                // Process all types
                foreach (var type in assembly.GetTypes())
                {
                    foreach (var method in type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic |
                                                           BindingFlags.Instance | BindingFlags.Static |
                                                           BindingFlags.DeclaredOnly))
                    {
                        try
                        {
                            // Skip compiler-generated methods
                            if (method.GetCustomAttributes(typeof(CompilerGeneratedAttribute), false).Length > 0)
                                continue;

                            // Get method address
                            RuntimeHelpers.PrepareMethod(method.MethodHandle);
                            IntPtr methodAddress = method.MethodHandle.GetFunctionPointer();

                            if (methodAddress != IntPtr.Zero)
                            {
                                // Build parameter string
                                string methodType = method.IsStatic ? "Static" : "Instance";
                                string paramString = GetParameterString(method);

                                // Use comma as delimiter, properly escape values for CSV
                                string className = EscapeCsvField(method.DeclaringType.FullName);
                                string methodName = EscapeCsvField(method.Name);
                                string signature = EscapeCsvField(paramString);
                                string address = methodAddress.ToInt64().ToString("X");

                                // Add line to CSV
                                csvContent.AppendLine($"{className},{methodName},{methodType},{signature},{address}");
                            }
                        }
                        catch (Exception)
                        {
                            // Silently skip methods that can't be processed
                        }
                    }

                    // Process nested types
                    ProcessNestedTypesForCsv(type, csvContent);
                }

                // Ensure output directory exists
                Directory.CreateDirectory(outputDirectory);

                // Write to file
                File.WriteAllText(csvFilePath, csvContent.ToString());

                return StringToHGlobalAnsiWithCleanup($"Success: CSV file written to {csvFilePath}");
            }
            catch (Exception e)
            {
                return StringToHGlobalAnsiWithCleanup($"Error: {e.Message}");
            }
        }

        private static void ProcessNestedTypesForCsv(Type type, StringBuilder csvContent)
        {
            foreach (var nestedType in type.GetNestedTypes(BindingFlags.Public | BindingFlags.NonPublic))
            {
                foreach (var method in nestedType.GetMethods(BindingFlags.Public | BindingFlags.NonPublic |
                                                            BindingFlags.Instance | BindingFlags.Static |
                                                            BindingFlags.DeclaredOnly))
                {
                    try
                    {
                        // Skip compiler-generated methods
                        if (method.GetCustomAttributes(typeof(CompilerGeneratedAttribute), false).Length > 0)
                            continue;

                        // Get method address
                        RuntimeHelpers.PrepareMethod(method.MethodHandle);
                        IntPtr methodAddress = method.MethodHandle.GetFunctionPointer();

                        if (methodAddress != IntPtr.Zero)
                        {
                            // Build parameter string
                            string paramString = GetParameterString(method);

                            // Use comma as delimiter, properly escape values for CSV
                            string className = EscapeCsvField(method.DeclaringType.FullName);
                            string methodName = EscapeCsvField(method.Name);
                            string signature = EscapeCsvField(paramString);
                            string address = "0x" + methodAddress.ToInt64().ToString("X");

                            // Add line to CSV
                            csvContent.AppendLine($"{className},{methodName},{signature},{address}");
                        }
                    }
                    catch (Exception)
                    {
                        // Silently skip methods that can't be processed
                    }
                }

                // Recursively process nested types
                ProcessNestedTypesForCsv(nestedType, csvContent);
            }
        }

        private static string EscapeCsvField(string field)
        {
            // If the field contains commas, quotes, or newlines, wrap it in quotes and escape any quotes
            if (field.Contains(",") || field.Contains("\"") || field.Contains("\n"))
            {
                return "\"" + field.Replace("\"", "\"\"") + "\"";
            }
            return field;
        }

        private static string GetParameterString(MethodInfo method)
        {
            var parameters = method.GetParameters();
            var paramStrings = new List<string>();

            foreach (var param in parameters)
            {
                string modifier = "";
                if (param.IsOut)
                    modifier = "out ";
                else if (param.ParameterType.IsByRef)
                    modifier = "ref ";

                // Get the parameter type name, handle generics appropriately
                string typeName = GetReadableTypeName(param.ParameterType);

                paramStrings.Add($"{modifier}{typeName} {param.Name}");
            }

            // Add return type
            string returnTypeName = GetReadableTypeName(method.ReturnType);

            return $"{returnTypeName} ({string.Join(", ", paramStrings)})";
        }

        private static string GetReadableTypeName(Type type)
        {
            if (type.IsByRef)
                type = type.GetElementType();

            if (type == typeof(void)) return "void";
            if (type == typeof(int)) return "int";
            if (type == typeof(string)) return "string";
            if (type == typeof(bool)) return "bool";
            if (type == typeof(long)) return "long";
            if (type == typeof(double)) return "double";
            if (type == typeof(float)) return "float";
            if (type == typeof(decimal)) return "decimal";
            if (type == typeof(byte)) return "byte";
            if (type == typeof(char)) return "char";
            if (type == typeof(object)) return "object";

            if (type.IsGenericType)
            {
                var genericArgs = string.Join(", ", type.GetGenericArguments().Select(GetReadableTypeName));
                var baseName = type.Name.Split('`')[0];
                return $"{baseName}<{genericArgs}>";
            }

            return type.Name;
        }

        private static void ProcessType(Type type, List<string> results)
        {
            // Process methods in the current type
            foreach (var method in type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic |
                                                  BindingFlags.Instance | BindingFlags.Static |
                                                  BindingFlags.DeclaredOnly))
            {
                try
                {
                    // Skip compiler-generated methods
                    if (method.GetCustomAttributes(typeof(CompilerGeneratedAttribute), false).Length > 0)
                        continue;

                    // Force JIT compilation by invoking PrepareMethod
                    RuntimeHelpers.PrepareMethod(method.MethodHandle);
                    IntPtr methodAddress = method.MethodHandle.GetFunctionPointer();

                    if (methodAddress != IntPtr.Zero)
                    {
                        // Build parameter string
                        string paramString = GetParameterString(method);

                        // Format: MethodName:Parameters:0xMemoryAddress
                        results.Add($"{method.DeclaringType.FullName}.{method.Name}:{paramString}:0x{methodAddress.ToInt64():X}");
                    }
                }
                catch (Exception e)
                {
                    // Handle invalid program exceptions gracefully
                    results.Add($"{method.DeclaringType.FullName}.{method.Name}:Error: {e.Message}");
                }
            }

            // Process nested types recursively
            foreach (var nestedType in type.GetNestedTypes(BindingFlags.Public | BindingFlags.NonPublic))
            {
                ProcessType(nestedType, results);
            }
        }

        private static IntPtr StringToHGlobalAnsiWithCleanup(string str)
        {
            // Using StringBuilder for large string concatenation improves performance
            if (str.Length > 10000)
            {
                GC.Collect(); // Help clean up memory before allocating a large unmanaged string
            }

            return Marshal.StringToHGlobalAnsi(str);
        }
    }
}