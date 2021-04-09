const isProduction = process.env["NODE_ENV"] === "production";

module.exports = {
	externals: { "agora-electron-sdk": "commonjs2 agora-electron-sdk" },
	watch: isProduction ? false : true,

	target: "electron-renderer",

	entry: "./app/main.js",

	output: {
		path: __dirname + "/build",
		publicPath: "build/",
		filename: "bundle.js"
	}
};
