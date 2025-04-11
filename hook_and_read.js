// Simple function hooking script

// Helper function to read .NET strings
function readDotNetString(strPtr) {
    if (strPtr.isNull()) return null;
    try {
        var length = strPtr.add(0x8).readS32();
        return length > 0 ? strPtr.add(0xC).readUtf16String(length) : "";
    } catch (e) {
        console.log("Error reading string at " + strPtr + ": " + e.message);
        return null;
    }
}

// Helper function to read .NET booleans
function readDotNetBool(boolPtr) {
    if (boolPtr.isNull()) return null;
    try {
        return boolPtr.readU8() !== 0;
    } catch (e) {
        console.log("Error reading boolean: " + e.message);
        return null;
    }
}

// Main hook function
function hookAtAddr(address, options = {}) {
    const functionAddress = ptr(address);
    const isStatic = options.isStatic || false;
    const functionName = options.functionName || "UnknownFunction";
    
    send(`Setting up hook for ${functionName} at address ${address}`);
    send(`Function type: ${isStatic ? "Static" : "Instance"}`);
    
    Interceptor.attach(functionAddress, {
        onEnter: function(args) {
            send(`🔥 Function called: ${functionName} at ${address} 🔥`);
            
            // Determine parameter offset based on static/instance
            const offset = isStatic ? 0 : 1;
            
            if (!isStatic) {
                send(`this pointer: ${args[0]}`);
            }
            
            // Try to log parameters (adjust based on actual parameter types)
            try {
                // Log first several args regardless of type
                for (let i = 0; i < 6; i++) {
                    if (args[i]) {
                        send(`args[${i}]: ${args[i]}`);
                        
                        // Try to interpret as string if it's the first actual parameter
                        if (i === offset) {
                            const strValue = readDotNetString(args[i]);
                            if (strValue !== null) {
                                send(`  Possible string value: ${strValue}`);
                            }
                        }
                    }
                }
            } catch (e) {
                send(`Error examining parameters: ${e.message}`);
            }
            
            // Store args for use in onLeave
            this.args = args;
        },
        
        onLeave: function(retval) {
            send(`Function ${functionName} returned: ${retval}`);
            
            // Try to interpret return value
            try {
                // Try as boolean
                const boolValue = readDotNetBool(retval);
                if (boolValue !== null) {
                    send(`  Possible boolean return: ${boolValue}`);
                }
                
                // Try as pointer/number
                if (!retval.isNull()) {
                    send(`  Return value as number: ${retval.toInt32()}`);
                }
            } catch (e) {
                // Non-critical, just log the error
                send(`  Error examining return value: ${e.message}`);
            }
            
            send(`💫 Function execution complete 💫`);
        }
    });
    
    send(`Hook installed successfully for ${functionName}`);
}

// Example usage:
// Hook an instance method
// hookAtAddr("0x7FFECB79C770", { 
//     isStatic: false, 
//     functionName: "CopyAndMinimize" 
// });

// Hook a static method
hookAtAddr("0x7FFCCEC7E450", { 
    isStatic: true, 
    functionName: "CopyAndMinimize" 
});