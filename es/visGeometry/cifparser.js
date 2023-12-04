import _defineProperty from "@babel/runtime/helpers/defineProperty";
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
/**
 * This is the only method in the package. Given the file path it returns an Object containing the mmCIF
 * file informations.
 * @param {String} str - file contents
 */
function getObject(str) {
  //DELETE COMMENTS AND VOID
  var fileArray = str.split("\n").map(function (str) {
    return str.trim();
  }).filter(function (v) {
    return v != "";
  }).filter(function (v) {
    return !v.startsWith("#");
  });

  //MERGE SEMICOLON LINES IN A UNIQUE ONE
  var semicolon = false;
  var sentence = "";
  for (var index = 0; index < fileArray.length; index++) {
    if (fileArray[index].startsWith(";") && semicolon === false) {
      semicolon = true;
      fileArray[index] = fileArray[index].substring(1, fileArray[index].length);
      sentence = sentence + fileArray[index];
      fileArray[index] = "";
    } else if (fileArray[index].startsWith(";") && semicolon === true) {
      semicolon = false;
      fileArray[index] = sentence;
      sentence = "";
    } else if (semicolon === true) {
      sentence = sentence + fileArray[index];
      fileArray[index] = "";
    }
  }
  fileArray = fileArray.filter(function (v) {
    return v != "";
  });
  var fileObj = {};
  var datablockObj = {};
  var firstBlock = true;
  var isLoop = false;
  var dataname = "";
  var precArray = [];

  //THIS FOREACH DIVIDES THE SINGLE BLOCKS AND ELABORATE THEM ONE AFTER ONE
  fileArray.forEach(function (line) {
    line = line.trim();
    if (line.startsWith("data_") && firstBlock) {
      //IF THERE ARE MULTIPLE DATABLOCKS
      datablockObj["datablock"] = line.split("data_").join("");
      firstBlock = false;
    } else if (line.startsWith("data_") && !firstBlock) {
      fileObj[datablockObj.datablock] = datablockObj;
      datablockObj = {};
      datablockObj["datablock"] = line.split("data_").join("");
    } else {
      if (line === "loop_") {
        //LOOP START

        dataname = "";
        if (precArray.length > 0) datablockObj = _objectSpread(_objectSpread({}, datablockObj), elaborate(precArray, isLoop));
        precArray = [];
        isLoop = true;
      } else if (dataname === "" && line.startsWith("_")) {
        //NEW DATANAME IN LOOP OR FIRST DATANAME

        dataname = line.split(".")[0];
        precArray = [];
        precArray.push(line);
      } else if (dataname !== "" && dataname !== line.split(".")[0] && line.startsWith("_")) {
        //NEW DATANAME NO LOOP

        dataname = line.split(".")[0];
        datablockObj = _objectSpread(_objectSpread({}, datablockObj), elaborate(precArray, isLoop));
        precArray = [];
        precArray.push(line);
        isLoop = false;
      } else {
        //INSIDE DATANAME

        precArray.push(line);
      }
    }
  });

  // handle last block
  if (precArray.length > 0) {
    datablockObj = _objectSpread(_objectSpread({}, datablockObj), elaborate(precArray, isLoop));
  }
  fileObj[datablockObj.datablock] = datablockObj;
  return fileObj;
}

/**
 * This function elaborate the single block.
 * @param {String[]} dataArray - the various lines
 * @param {boolean} isLoop - is it a loop block?
 */
function elaborate(dataArray, isLoop) {
  var valueArray = [];
  var nameArray = [];
  var dataName = "";
  var jsonObj = {};
  if (isLoop) {
    //BLOCK IS LOOP

    var contArray = [];
    dataArray.forEach(function (line) {
      line = line.trim();
      if (line.startsWith("_")) {
        //DATANAME LINE
        dataName = line.split(".")[0];
        nameArray.push(line.split(".")[1]);
      } else {
        //VALUES LINES

        var field = "";
        var controlChar = " ";
        var pushed = false;
        for (var index = 0; index < line.length; index++) {
          //SPLIT BY WHITE SPACES EXEPT BETWEEN "" AND ''. P.S. I HATE REGEX.

          if (controlChar === " " && line.charAt(index) === "'") {
            // OPEN '

            controlChar = "'";
            pushed = false;
          } else if (controlChar === " " && line.charAt(index) === '"') {
            // OpEN "

            controlChar = '"';
            pushed = false;
          } else if (controlChar === " " && line.charAt(index) === " ") {
            if (field.trim() !== "") valueArray.push(field);
            field = "";
            pushed = true;
          } else if (controlChar === "'" && line.charAt(index) === "'") {
            // CLOSE '

            valueArray.push(field);
            field = "";
            controlChar = " ";
            pushed = true;
          } else if (controlChar === '"' && line.charAt(index) === '"') {
            // CLOSE "

            valueArray.push(field);
            field = "";
            controlChar = " ";
            pushed = true;
          } else {
            field = field + line.charAt(index);
            pushed = false;
          }
        }
        if (!pushed) valueArray.push(field);
      }
    });
    var i = 0;
    var obj = {};
    for (var increment = 0; increment < valueArray.length; increment++) {
      if (i === nameArray.length) {
        i = 0;
        contArray.push(obj);
        obj = {};
      }
      obj[nameArray[i]] = valueArray[increment];
      i++;
    }
    contArray.push(obj);
    jsonObj[dataName] = contArray;
  } else {
    //NOT LOOP DATA

    var _dataName = dataArray.join("").trim().split(".")[0];
    dataArray = dataArray.join(" ").trim().split(_dataName + ".").filter(function (v) {
      return v != "";
    });
    var subObj = {};
    dataArray.forEach(function (line) {
      line = line.trim();
      var id = line.split(" ")[0];
      line = line.replace(id, "").trim();
      line = line.split("'").join("");
      subObj[id] = line;
    });
    jsonObj[_dataName] = subObj;
  }
  return jsonObj;
}
export { getObject };