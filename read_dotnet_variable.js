function readDotNetString(strPtr) {
    if (strPtr.isNull()) {
        return null;
    }

    try {
        //  Read the length of the string (number of characters)
        //  strPtr.add(0x8): Skips the method table pointer to read the string length.
        //  Memory.readS32: Reads a 32-bit signed integer representing the length.       
        var length = strPtr.add(0x8).readS32(); 

        //  Read the UTF-16 string data
        //  strPtr.add(0xC): Points to the start of the string characters.
        //  Memory.readUtf16String: Reads the UTF-16 encoded string.
        var chars = strPtr.add(0xC).readUtf16String(length);

        return chars;
    } catch (e) {
        send("Error reading string at " + strPtr + ": " + e.message);
        return null;
    }
}

let functionAddress = ptr("0x7FFB18D0FDE0");  // Replace with the actual memory address

Interceptor.attach(functionAddress, {
    onEnter: function (args) {
        send("Hooked!");

        var thisPtr = args[0]; // The this pointer to the object instance.
        var textPtr = args[1]; // The string text parameter.

        send("args[0] (this): " + thisPtr);
        send("args[1] (textPtr): " + textPtr);

        // Read the 'text' parameter
        var textValue = readDotNetString(textPtr);
        send("text parameter value: " + textValue);
    },
    onLeave: function (retval) {
        // Additional handling if needed
    }
});
