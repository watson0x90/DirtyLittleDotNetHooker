using System;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

namespace FunctionEnumerator
{
    public class FunctionEnumerator
    {
        [DllExport("EnumerateFunctions", CallingConvention = CallingConvention.StdCall)]
        public static IntPtr EnumerateFunctions(string assemblyPath)
        {
            var results = new List<string>();

            try
            {
                // Load the .NET assembly
                Assembly assembly = Assembly.LoadFrom(assemblyPath);
                foreach (var type in assembly.GetTypes())
                {
                    foreach (var method in type.GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance | BindingFlags.Static))
                    {
                        try
                        {
                            // Force JIT compilation by invoking PrepareMethod
                            RuntimeHelpers.PrepareMethod(method.MethodHandle);
                            IntPtr methodAddress = method.MethodHandle.GetFunctionPointer();
                            if (methodAddress != IntPtr.Zero)
                            {
                                // Format: MethodName:0xMemoryAddress
                                results.Add($"{method.DeclaringType.FullName}.{method.Name}:0x{methodAddress.ToInt64():X}");
                            }
                        }
                        catch (Exception e)
                        {
                            // Handle invalid program exceptions gracefully
                            results.Add($"{method.DeclaringType.FullName}.{method.Name}:Error: {e.Message}");
                        }
                    }
                }
            }
            catch (Exception e)
            {
                return Marshal.StringToHGlobalAnsi($"Error: {e.Message}");
            }

            // Join results and return as a single string
            return Marshal.StringToHGlobalAnsi(string.Join("|", results));
        }
    }
}
