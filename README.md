# HuddleC

ANDROID
Setting up from Scratch

1. Download git
https://git-scm.com/download/win
2. Create folder and git init
3. git remote add origin https://github.com/CoffeePaste/HuddleC
4. git pull origin master

5. Download Visual Studio Code

6. Follow Guide
https://facebook.github.io/react-native/docs/getting-started.html

7. Restart Powershell -> npm install

8. ( DEPRECATED )
Go to folder /node_modules/react-native-tab-view/src/TabViewAnimated
at the 'renderHeader' and 'renderFooter' lines (approx 265 & 278),
remove the Collapsable 'View' Components
it should look like:
{renderHeader && renderHeader(props)}
and
{renderFooter && renderFooter(props)}

9. Fonts will need to be linked again: 
    run: react-native link
    delete: changes made in settings.gradle and MainActivity if there are duplicates
    refer to: https://medium.com/@danielskripnik/how-to-add-and-remove-custom-fonts-in-react-native-b2830084b0e4

10. react-native run-android

11. (ERROR) If 'adb' is unrecognized, add it in the PATH variable through Control Panel
Control Panel -> System and Security -> System -> Change Settings -> Advanced -> ENV Variables
Add to System Variables -> Path -> New
C:\Users\YOUR_USER_NAME\AppData\Local\Android\Sdk\platform-tools


IOS
Setting up from Scratch

1. - 7. are the same as Android
