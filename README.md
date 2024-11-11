# DirtyLittleDotNetHooker
## Description
Find .Net Functions to use with Frida and Fermion. 

**Blog Posts**
- https://watson0x90.com/net-hooking-with-frida-and-fermion-c14d4f19c823 - (Part 1)
  - How to enumerate, find and hook functions 
- https://watson0x90.com/net-hooking-with-frida-and-fermion-part-2-206f96524380 - (Part 2)
  - How to read variables after you have hooked a function  

## How to build 
1. Create a new Visual Studio project:
    - Type: Class Library (.NET Framework) - A Project for creating a C# class library (.dll)
    - Name: `FunctionEnumerator`

2. Add the following Nuget Package to the project:
    - https://www.nuget.org/packages/dllexport

3. You wil then see a new popup window to configure the project using the DLLExport GUI. Set the following options:
    - Note: Ensure that your options look exact 

![image](https://github.com/user-attachments/assets/8b2ebcd0-b862-4e1e-b49d-dcc8a9f7c53e)


4. Copy and Past the code from the FunctionEnumerator.cs code into Visual Studio

5. Build the project!
    - It is fine to leave the buid as "Debug"


## How to use with Ferion 

1. Open the lovely Fermion tool, and paste in the `fermion_dotnet_hooking_script.js` script

2. Change the approrpiate values for the `dllPath`, `targetAssemblyPath`, and `funcName`

3. Attach to the process and the script will run

4. The output in the text area will include the address of the function

![image](https://github.com/user-attachments/assets/ed5506f0-f967-4ba3-8440-f39db900737b)

5. Now you can comment out the `findFunc()` and uncomment `hookAtAddr()`

6. Change the address with the acutally memory address from your output

7. Watch the beautiful interception happen!!

![image](https://github.com/user-attachments/assets/23444bf8-e24f-45c2-82b4-1bec2a8a4297)

## How to read variables

- Instance Function
- Static Function

### Instance Function
#### Description
It turns out that when intercepting a .Net instance function and attempting to read .Net variables, we are dealing with multiple variables, not just what is presented in a tool like DnSpy. 

Lets consider the following example function:

```c#
public void updateUsername(string username)
{
  this.MyAppUsername.Text = username;
}
```
The breakdown:
  - The function takes one parameter of type `string` named `username`.
  - The function body sets the `Text` property of the `MyAppUsername` object to the value of the `username` parameter.
  - The function is an instance method, meaning it operates on an instance of a class (this).

Calling Convention on x64 Windows:

- Microsoft x64 Calling Convention: The first four arguments are passed in the registers RCX, RDX, R8, and R9.
    - RCX (args[0]): Used for the `this` pointer in instance methods.
    - RDX (args[1]): First argument (if this is present). Which is the string username parameter.
    - R8: Second argument.
    - R9: Third argument.

When attempting to intercept a similar function before, I assumed that I was only dealing with one argument. So, I intercepted the function with Frida; I attempted to read the value at args[0] with no success. I attempted to dereference the pointer and read values, but I had no success. It was only when I was chatting with ChatGPT that I ended up getting an unexpected answer.

I descrbed the function I was trying to access and provided its example layout, I was surpised by the response:

```Given this information, we can proceed to determine what args[0] and args[1] are in your hook and how to extract the string parameter text from args[1].```

I thought it was interesting that I was told to read the value of `args[1]` because I was under the impression I was dealing with only ONE argument being passed. It turns out that the text string is accessible via `args[1]` while the object instance is stored within `args[0]`.

Adding in a helper function to read the dotnet string, I was able to return the string value:

![image](https://github.com/user-attachments/assets/f8cc432e-7778-48f3-b7d2-37f6ad1e9410)

![image](https://github.com/user-attachments/assets/0dbf419a-d3da-4eb2-becc-16f96e89b994)


The code is reference in `read_dotnet_variable.js`

I will still need to research to determine what happens if I take in multiple parameters of different types, but this is still very interesting. 

## Static Functions

### Description

In Static Functions, there is no `this` pointer because the method belongs to the class itself rather than an instance of the class. This affects how the arguments are passed and how they should be accessed in a Frida script.

#### Understanding Argument Passing in Static Functions
##### Calling Convention for x64 Windows (Microsoft x64 Calling Convention)
- First Argument (args[0]): Passed in the RCX register.
- Second Argument (args[1]): Passed in the RDX register.
- Third Argument (args[2]): Passed in the R8 register.
- Fourth Argument (args[3]): Passed in the R9 register.
- Additional Arguments: Passed on the stack.

For Static Functions:

- Since there is no this pointer, args[0] corresponds to the first parameter of the method.

#### Example Function

Here is an example C# static function
```c#
public static bool updatePolicy(string jsonReply)
{
    // Function body...
}
```

To read the variable, we will use custom Frida function, referenced below, `readDotNetString` to read `args[0]`.

```javascript
// Hook the function at the given address
Interceptor.attach(functionAddress, {
    onEnter: function (args) {
        var textPtr = args[0];

        send("args[0] (textPtr): " + textPtr);

        // Read the 'jsonReply' parameter
        var textValue = readDotNetString(textPtr);
        send("Original jsonReply parameter value: " + textValue);
    },
    onLeave: function (retval) {
        // Additional handling if needed
    }
});

```

##  Known Issues
-  Need to figure out how to unload the DLL after it is used. Right now it is loaded into the process and will stay there.

## Additional Info & Links
- https://github.com/FuzzySecurity/Fermion
- https://labs.calypso.pub/windows-instrumentation-with-frida

![image](https://github.com/user-attachments/assets/d4528833-db77-4fe3-b2f0-85ced9e96fa0)

