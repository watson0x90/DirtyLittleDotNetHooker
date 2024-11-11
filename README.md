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


4. Copy and Past the code from the FunctionEnumerator.cs script below into Visual Studio
    - It is fine to leave the buid as "Debug"

5. Open the lovely Fermion tool, and paste in the `fermion_dotnet_hooking_script.js` script

6. Change the approrpiate values for the `dllPath`, `targetAssemblyPath`, and `funcName`

7. Attach to the process and the script will run

8. The output in the text area will include the address of the function

![image](https://github.com/user-attachments/assets/ed5506f0-f967-4ba3-8440-f39db900737b)


9. Now you can comment out the `findFunc()` and uncomment `hookAtAddr()`

10. Change the address with the acutally memory address from your output

11. Watch the beautiful interception happen!!

![image](https://github.com/user-attachments/assets/23444bf8-e24f-45c2-82b4-1bec2a8a4297)


## Issues
-  Need to figure out how to unload the DLL after it is used. Right now it is loaded into the process and will stay there.

## Additional Info & Links
- https://github.com/FuzzySecurity/Fermion
- https://labs.calypso.pub/windows-instrumentation-with-frida
