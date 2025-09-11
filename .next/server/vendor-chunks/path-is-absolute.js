"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/path-is-absolute";
exports.ids = ["vendor-chunks/path-is-absolute"];
exports.modules = {

/***/ "(rsc)/./node_modules/path-is-absolute/index.js":
/*!************************************************!*\
  !*** ./node_modules/path-is-absolute/index.js ***!
  \************************************************/
/***/ ((module) => {

eval("\nfunction posix(path) {\n    return path.charAt(0) === \"/\";\n}\nfunction win32(path) {\n    // https://github.com/nodejs/node/blob/b3fcc245fb25539909ef1d5eaa01dbf92e168633/lib/path.js#L56\n    var splitDeviceRe = /^([a-zA-Z]:|[\\\\\\/]{2}[^\\\\\\/]+[\\\\\\/]+[^\\\\\\/]+)?([\\\\\\/])?([\\s\\S]*?)$/;\n    var result = splitDeviceRe.exec(path);\n    var device = result[1] || \"\";\n    var isUnc = Boolean(device && device.charAt(1) !== \":\");\n    // UNC paths are always absolute\n    return Boolean(result[2] || isUnc);\n}\nmodule.exports = process.platform === \"win32\" ? win32 : posix;\nmodule.exports.posix = posix;\nmodule.exports.win32 = win32;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvcGF0aC1pcy1hYnNvbHV0ZS9pbmRleC5qcyIsIm1hcHBpbmdzIjoiQUFBQTtBQUVBLFNBQVNBLE1BQU1DLElBQUk7SUFDbEIsT0FBT0EsS0FBS0MsTUFBTSxDQUFDLE9BQU87QUFDM0I7QUFFQSxTQUFTQyxNQUFNRixJQUFJO0lBQ2xCLCtGQUErRjtJQUMvRixJQUFJRyxnQkFBZ0I7SUFDcEIsSUFBSUMsU0FBU0QsY0FBY0UsSUFBSSxDQUFDTDtJQUNoQyxJQUFJTSxTQUFTRixNQUFNLENBQUMsRUFBRSxJQUFJO0lBQzFCLElBQUlHLFFBQVFDLFFBQVFGLFVBQVVBLE9BQU9MLE1BQU0sQ0FBQyxPQUFPO0lBRW5ELGdDQUFnQztJQUNoQyxPQUFPTyxRQUFRSixNQUFNLENBQUMsRUFBRSxJQUFJRztBQUM3QjtBQUVBRSxPQUFPQyxPQUFPLEdBQUdDLFFBQVFDLFFBQVEsS0FBSyxVQUFVVixRQUFRSDtBQUN4RFUsb0JBQW9CLEdBQUdWO0FBQ3ZCVSxvQkFBb0IsR0FBR1AiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9yZXN1bWUtYXRzLXJldmlld2VyLy4vbm9kZV9tb2R1bGVzL3BhdGgtaXMtYWJzb2x1dGUvaW5kZXguanM/OWQyZCJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIHBvc2l4KHBhdGgpIHtcblx0cmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59XG5cbmZ1bmN0aW9uIHdpbjMyKHBhdGgpIHtcblx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL25vZGVqcy9ub2RlL2Jsb2IvYjNmY2MyNDVmYjI1NTM5OTA5ZWYxZDVlYWEwMWRiZjkyZTE2ODYzMy9saWIvcGF0aC5qcyNMNTZcblx0dmFyIHNwbGl0RGV2aWNlUmUgPSAvXihbYS16QS1aXTp8W1xcXFxcXC9dezJ9W15cXFxcXFwvXStbXFxcXFxcL10rW15cXFxcXFwvXSspPyhbXFxcXFxcL10pPyhbXFxzXFxTXSo/KSQvO1xuXHR2YXIgcmVzdWx0ID0gc3BsaXREZXZpY2VSZS5leGVjKHBhdGgpO1xuXHR2YXIgZGV2aWNlID0gcmVzdWx0WzFdIHx8ICcnO1xuXHR2YXIgaXNVbmMgPSBCb29sZWFuKGRldmljZSAmJiBkZXZpY2UuY2hhckF0KDEpICE9PSAnOicpO1xuXG5cdC8vIFVOQyBwYXRocyBhcmUgYWx3YXlzIGFic29sdXRlXG5cdHJldHVybiBCb29sZWFuKHJlc3VsdFsyXSB8fCBpc1VuYyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJyA/IHdpbjMyIDogcG9zaXg7XG5tb2R1bGUuZXhwb3J0cy5wb3NpeCA9IHBvc2l4O1xubW9kdWxlLmV4cG9ydHMud2luMzIgPSB3aW4zMjtcbiJdLCJuYW1lcyI6WyJwb3NpeCIsInBhdGgiLCJjaGFyQXQiLCJ3aW4zMiIsInNwbGl0RGV2aWNlUmUiLCJyZXN1bHQiLCJleGVjIiwiZGV2aWNlIiwiaXNVbmMiLCJCb29sZWFuIiwibW9kdWxlIiwiZXhwb3J0cyIsInByb2Nlc3MiLCJwbGF0Zm9ybSJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/path-is-absolute/index.js\n");

/***/ })

};
;