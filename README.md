# This application may not be resold or republished under someone else's name and credits may not be removed from the application. 

# clubhouse-desktop

This is an unofficial desktop client for the currently trending ClubHouse.

# Any bans on the accounts is possible so use it at your own risk!

Developed Using Electron JS + Vue JS + AgoraSDK.

For downloading the Mac/Linux/Windows compiled version go to releases section.
https://github.com/callmearta/clubhouse-desktop/releases

I know source code is a mess, but since it's been developed in a hurry ( about 30-40hrs ) to get it working and also since it was my first time using Electron, Vue, and Agora, i put my time into adding new features and improving stability instead of a clean code. So if you think it's a mess, feel free to make it clean and do a pull request.
Also i'm using a really old version of Agora web SDK and that's because new version of Agora won't work because of the limitation they put on the user agents for clubhouse ( at least i think so ).


# Screenshot

![Screenshot](https://github.com/callmearta/clubhouse-desktop/blob/main/Screen%20Shot%202021-03-14%20at%2018.01.56.png?raw=true)


# How to run source code locally
1. Clone the project
2. Go to root folder of project and run `npm install`
3. Run `npm start` to run the project

# How to build source code
I've used electron-packager myself for bundling the app and building releases. You can do so using electron-packager too. I hope you do not build versions with minor changes and credit yourself for it!
