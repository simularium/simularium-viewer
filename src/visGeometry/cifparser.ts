/**
 * This is the only method in the package. Given the file path it returns an Object containing the mmCIF
 * file informations.
 * @param {String} str - file contents
 */
function getObject(str) {
    //DELETE COMMENTS AND VOID
    var fileArray = str
        .split("\n")
        .map((str) => str.trim())
        .filter((v) => v != "")
        .filter((v) => !v.startsWith("#"));

    //MERGE SEMICOLON LINES IN A UNIQUE ONE
    var semicolon = false;
    var sentence = "";

    for (let index = 0; index < fileArray.length; index++) {
        if (fileArray[index].startsWith(";") && semicolon === false) {
            semicolon = true;
            fileArray[index] = fileArray[index].substring(
                1,
                fileArray[index].length
            );
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

    fileArray = fileArray.filter((v) => v != "");

    var fileObj = {};

    var datablockObj = {};
    var firstBlock = true;

    var isLoop = false;
    var dataname = "";
    var precArray = new Array();

    //THIS FOREACH DIVIDES THE SINGLE BLOCKS AND ELABORATE THEM ONE AFTER ONE
    fileArray.forEach((line) => {
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
                if (precArray.length > 0)
                    datablockObj = {
                        ...datablockObj,
                        ...elaborate(precArray, isLoop),
                    };
                precArray = new Array();
                isLoop = true;
            } else if (dataname === "" && line.startsWith("_")) {
                //NEW DATANAME IN LOOP OR FIRST DATANAME

                dataname = line.split(".")[0];
                precArray = new Array();
                precArray.push(line);
            } else if (
                dataname !== "" &&
                dataname !== line.split(".")[0] &&
                line.startsWith("_")
            ) {
                //NEW DATANAME NO LOOP

                dataname = line.split(".")[0];
                datablockObj = {
                    ...datablockObj,
                    ...elaborate(precArray, isLoop),
                };
                precArray = new Array();
                precArray.push(line);
                isLoop = false;
            } else {
                //INSIDE DATANAME

                precArray.push(line);
            }
        }
    });

    fileObj[datablockObj.datablock] = datablockObj;

    return fileObj;
}

/**
 * This function elaborate the single block.
 * @param {String[]} dataArray - the various lines
 * @param {boolean} isLoop - is it a loop block?
 */
function elaborate(dataArray, isLoop) {
    var valueArray = new Array();
    var nameArray = new Array();

    var dataName = "";

    var JSONObj = {};

    if (isLoop) {
        //BLOCK IS LOOP

        var contArray = new Array();

        dataArray.forEach((line) => {
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

                for (let index = 0; index < line.length; index++) {
                    //SPLIT BY WHITE SPACES EXEPT BETWEEN "" AND ''. P.S. I HATE REGEX.

                    if (controlChar === " " && line.charAt(index) === "'") {
                        // OPEN '

                        controlChar = "'";
                        pushed = false;
                    } else if (
                        controlChar === " " &&
                        line.charAt(index) === '"'
                    ) {
                        // OpEN "

                        controlChar = '"';
                        pushed = false;
                    } else if (
                        controlChar === " " &&
                        line.charAt(index) === " "
                    ) {
                        if (field.trim() !== "") valueArray.push(field);
                        field = "";
                        pushed = true;
                    } else if (
                        controlChar === "'" &&
                        line.charAt(index) === "'"
                    ) {
                        // CLOSE '

                        valueArray.push(field);
                        field = "";
                        controlChar = " ";
                        pushed = true;
                    } else if (
                        controlChar === '"' &&
                        line.charAt(index) === '"'
                    ) {
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
        for (let increment = 0; increment < valueArray.length; increment++) {
            if (i === nameArray.length) {
                i = 0;
                contArray.push(obj);
                obj = {};
            }

            obj[nameArray[i]] = valueArray[increment];
            i++;
        }

        contArray.push(obj);

        JSONObj[dataName] = contArray;
    } else {
        //NOT LOOP DATA

        var dataName = dataArray.join("").trim().split(".")[0];

        dataArray = dataArray
            .join(" ")
            .trim()
            .split(dataName + ".")
            .filter((v) => v != "");

        var subObj = {};

        dataArray.forEach((line) => {
            line = line.trim();
            var id = line.split(" ")[0];
            line = line.replace(id, "").trim();
            line = line.split("'").join("");
            subObj[id] = line;
        });

        JSONObj[dataName] = subObj;
    }

    return JSONObj;
}

export { getObject };
