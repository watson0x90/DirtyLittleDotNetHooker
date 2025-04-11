function findFunc(options = { printFunctions: false }){
    // Load the FunctionEnumerator C# DLL. Specify your path
    const dllPath = "C:\\Users\\training\\Tools\\FunctionEnumerator.dll";
    send("Loading DLL: " + dllPath);
    const myModule = Module.load(dllPath);
    
    // Define the function prototype in Frida
    const enumerateFunctions = new NativeFunction(
        myModule.getExportByName("EnumerateFunctions"),  // Function in DLL
        'pointer',                    // Return type (pointer to string)
        ['pointer']                   // Argument types (pointer to assembly path string)
    );
    
    // Define the WriteToCSV function prototype
    const writeToCSV = new NativeFunction(
        myModule.getExportByName("WriteToCSV"),  // New function in DLL
        'pointer',                    // Return type (pointer to result string)
        ['pointer', 'pointer']        // Argument types (pointers to assembly path and output directory)
    );
    
    // Allocate and write the path of the target assembly in memory
    // Replace with your .NET PE Path
    const targetAssemblyPath = Memory.allocUtf8String("C:\\Users\\training\\Desktop\\bsides\\victim\\KeePass-2.58\\KeePass.exe");
    send("Scanning assembly: " + targetAssemblyPath.readUtf8String());
    
    // Add output directory path (now we only specify the directory, not the full filename)
    // Replace with your location
    const outputDirectory = Memory.allocUtf8String("C:\\Users\\training\\Desktop");
    
    // Call the function and capture the result
    send("Enumerating functions...");
    const resultPointer = enumerateFunctions(targetAssemblyPath);
    const resultString = resultPointer.readUtf8String();
    send("Function enumeration complete!");
    
    // Write to CSV
    function exportToCsv() {
        send("Exporting to CSV...");
        const csvResultPointer = writeToCSV(targetAssemblyPath, outputDirectory);
        const csvResult = csvResultPointer.readUtf8String();
        send(`CSV Export Result: ${csvResult}`);
    }
    
    function print_all_funcs(){
        if (!options.printFunctions) {
            send("Function printing disabled. Set options.printFunctions = true to print all functions.");
            return;
        }
        
        send("Printing all functions to console...");
        send("Format: ClassName,FunctionName,FunctionType,Signature,Address");
        
        // Updated parsing logic for the new format that includes method type
        const functionList = resultString.split("|").map(item => {
            // Split by last ":" to get address
            const lastColonIndex = item.lastIndexOf(":");
            const address = item.substring(lastColonIndex + 1);
            const nameAndInfo = item.substring(0, lastColonIndex);
            
            // Parse the remaining parts
            let parts = nameAndInfo.split(":");
            
            // For normal function entries (not error entries)
            if (parts.length >= 3) {
                const fullName = parts[0];
                const methodType = parts[1]; // Static or Instance
                const signature = parts.slice(2).join(":"); // Reassemble the signature part
                
                // Split class name and method name
                const lastDotIndex = fullName.lastIndexOf(".");
                const className = fullName.substring(0, lastDotIndex);
                const methodName = fullName.substring(lastDotIndex + 1);
                
                return {
                    className: className,
                    methodName: methodName,
                    methodType: methodType,
                    signature: signature,
                    address: address
                };
            } else {
                // Handle error entries or other formats
                return {
                    className: "Unknown",
                    methodName: nameAndInfo,
                    methodType: "Unknown",
                    signature: "",
                    address: address
                };
            }
        });
        
        // Print out each function with all information in CSV-like format
        functionList.forEach(func => {
            if (func.address.startsWith("0x")) {
                send(`${func.className},${func.methodName},${func.methodType},${func.signature},${func.address}`);
            } else {
                send(`${func.className},${func.methodName},Error: ${func.address}`);
            }
        });
        
        send("Function printing complete. Total functions: " + functionList.length);
    }
    
    function print_selected_func(targetFunctionName){
        // Updated filtering logic
        const functionList = resultString.split("|").map(item => {
            // Split by last ":" to get address
            const lastColonIndex = item.lastIndexOf(":");
            const address = item.substring(lastColonIndex + 1);
            const nameAndInfo = item.substring(0, lastColonIndex);
            
            // Parse the remaining parts
            let parts = nameAndInfo.split(":");
            
            // For normal function entries (not error entries)
            if (parts.length >= 3) {
                const fullName = parts[0];
                const methodType = parts[1]; // Static or Instance
                const signature = parts.slice(2).join(":"); // Reassemble the signature part
                
                // Split class name and method name
                const lastDotIndex = fullName.lastIndexOf(".");
                const className = fullName.substring(0, lastDotIndex);
                const methodName = fullName.substring(lastDotIndex + 1);
                
                return {
                    className: className,
                    methodName: methodName,
                    methodType: methodType,
                    signature: signature,
                    address: address
                };
            } else {
                // Handle error entries or other formats
                return {
                    className: "Unknown",
                    methodName: nameAndInfo,
                    methodType: "Unknown",
                    signature: "",
                    address: address
                };
            }
        });
        
        // Filter and print only the target functions
        const matchingFunctions = functionList.filter(func => 
            func.className.includes(targetFunctionName) || 
            func.methodName.includes(targetFunctionName)
        );
        
        if (matchingFunctions.length === 0) {
            send(`No functions found matching: ${targetFunctionName}`);
        } else {
            send(`Found ${matchingFunctions.length} functions matching "${targetFunctionName}":`);
            send("Format: ClassName,FunctionName,FunctionType,Signature,Address");
            
            matchingFunctions.forEach(func => {
                if (func.address.startsWith("0x")) {
                    send(`${func.className},${func.methodName},${func.methodType},${func.signature},${func.address}`);
                } else {
                    send(`${func.className},${func.methodName},Error: ${func.address}`);
                }
            });
        }
    }
    
    // Export to CSV always runs
    exportToCsv();
    
    // Only print functions if explicitly enabled
    print_all_funcs();
    
    // Return the parsed data for further use
    return {
        resultString: resultString,
        printSelectedFunc: print_selected_func,
        // Other utility functions can be exposed here
    };
}

// Example usage:
// Run with default options (no function printing)
findFunc();

// Run with function printing enabled
// findFunc({ printFunctions: true });

// To search for a specific function after running findFunc
// const result = findFunc();
// result.printSelectedFunc("CopyAndMinimize");