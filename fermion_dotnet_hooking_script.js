function findFunc(){
    // Load the custom C# DLL from your build path
    const dllPath = "C:\\Users\\User\\source\\repos\\FunctionEnumerator\\FunctionEnumerator\\bin\\Debug\\x64\\FunctionEnumerator.dll";
    const myModule = Module.load(dllPath);

    // Define the function prototype in Frida
    const enumerateFunctions = new NativeFunction(
        myModule.getExportByName("EnumerateFunctions"),  // Function in DLL
        'pointer',                    // Return type (pointer to string)
        ['pointer']                   // Argument types (pointer to assembly path string)
    );

    // Allocate and write the path of the target assembly in memory
    const targetAssemblyPath = Memory.allocUtf8String("C:\\Program Files\\Test\\Test\\Test.exe");

    
    // Call the function and capture the result
    const resultPointer = enumerateFunctions(targetAssemblyPath);
    const resultString = resultPointer.readUtf8String();  // Corrected syntax

    function print_all_funcs(){
    // Updated parsing logic for printing
        const functionList = resultString.split("|").map(item => {
            const [name, address] = item.split(":0x");  // Split by ":0x" to get name and hex address
            return { 
                name, 
                address: "0x" + address  // Keep address as a string in hex format for printing
            };
        });

        // Print out each function name and offset
        functionList.forEach(func => {
            send(`Function: ${func.name}, Address: ${func.address}`);
        });
    }

    function print_selected_func(targetFunctionName){
        // Updated parsing logic for filtering and printing
        const functionList = resultString.split("|").map(item => {
            const [name, address] = item.split(":0x");  // Split by ":0x" to get name and hex address
            return { 
                name, 
                address: address ? "0x" + address : "Error"  // Handle errors gracefully
            };
        });

        // Filter and print only the target function
        functionList.forEach(func => {
            if (func.name.includes(targetFunctionName)) {
                if (func.address !== "Error") {
                    send(`Function: ${func.name}, Address: ${func.address}`);
                } else {
                    send(`Function: ${func.name}, Address: Error retrieving address`);
                }
            }
        });
    }

    //Enumerate all of the functions. Can be a huge list!
    //print_all_funcs();

    //Print the address for a specific function
    let funcName = "FunctionName";
    print_selected_func(funcName);
    
}

function hookAtAddr(){
    // Define the memory address of the function directly
    const functionAddress = ptr("0x7FFC38E7AF90");  // Replace with the actual memory address from your output

    // Hook the function at the given address
    Interceptor.attach(functionAddress, {
        onEnter(args) {
            // Log arguments or perform any action on function entry
            send("Intercepted function call at address: " + functionAddress);
            
        },
        onLeave(retval) {
            // Optionally modify the return value or log it            
        }
    });

}

//Uncomment the function below to either find or hook :)
//hookAtAddr();
findFunc();
