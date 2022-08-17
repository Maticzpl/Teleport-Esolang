const prompt = require("prompt-sync")({ sigint: true });  
const fs = require('fs');


async function main() {
    let debug = false;
    let maxLogHeight = 0;
    try{
        function error(line, lineI, reason) {            
            throw `ERROR Line ${lineI+1}: ${reason}\n${lineI + 1} |${line}`;     
        }

        let path = process.argv[2];// || "./fibonaci.factory";
        if (path == undefined) {
            throw "ERROR: No file provided.";
        }
        
        let breakpoints = [];

        for (let arg = 3; arg < process.argv.length; arg++) {
            let argument = process.argv[arg];
            if (argument == "--debug") {
                debug = true;            
            }
            else if (argument.startsWith("--break:")) {
                breakpoints = argument.split(":")[1].split(",");
            }
            else
                throw `ERROR: Invalid parameter ${argument}`;

        }

        let code = await new Promise((res)=>{
            fs.readFile(path, 'utf8', (err, data) => {
                if (err) {
                    console.error(err);
                    return;
                }
                res(data);
            });
        });
        let debugCode = code;
        let vars = [];
        let tpIn = [];
        let tpOut = [];
        let starts = [];
        let outLog = "";
        let regex = /\/\/.*\n/g;
        let breakpoint = true;
        code = code.replace(/\r\n/g,"\n");
        code += "\n"; // don't ask
        code = code.replace(regex, "\n") //remove comments
        let lines = code.split("\n");
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            line = line.trim();

            if (line == "") 
                continue;
            

            if (line.startsWith("[")) {
                let val = line.split("[")[1].split("]")[0];
                
                if (val == '') {
                    error (line,i,"No value found inside square brackets.");                    
                }
                if (!line.includes("]")) {
                    error (line,i,"No closing bracket.");                 
                }

                val = val.replace("{","[").replace("}","]");
                vars[i] = eval(val); //xd eval
            }
            else if (line.startsWith("!")) {
                starts.push({line: i});
            }
            else if (line.startsWith("|")) { }
            else if (line.startsWith("<")) { }
            else if (line.startsWith("=")) { }
            else if (line.startsWith("?")) { }
            else {
                error (line,i,"Invalid character.");         
            }
                
            let arrowCount = 0
            if (line.includes("->")) {
                arrowCount++;
                let tpName = line.split("#")[1];
                if (tpName == undefined) {
                    error (line,i,"\"#\"---- symbol missing after ->.");                           
                }

                tpOut[i] = {name: tpName, value: undefined};
            }
            if (line.includes("<-")) {
                arrowCount++;
                let tpName = line.split("#")[1];
                if (tpName == undefined) {
                    error (line,i,"\"#\" symbol missing after <-.");                    
                }

                tpIn[i] = {name: tpName, sendSignal: false};
            }
            if (line.includes("<<")) {
                arrowCount++;
                let tpName = line.split("#")[1];
                if (tpName == undefined) {
                    error (line,i,"\"#\" symbol missing after <<.");                      
                }
                
                tpIn[i] = {name: tpName, sendSignal: true};
            }
            
            if (line.includes("#") && arrowCount == 0) {
                error (line,i,"arrow missing before \"#\" symbol.");                      
            }

            if (arrowCount != 1 && arrowCount != 0) {
                error (line,i,"too many arrows.");                   
            }


        }
        function findTp(array, equals) {
            for (const el of array) {
                if (el != undefined && el.name == equals) {
                    return el;
                }
            }
            return undefined;
        }
        function checkFunctions(line, i, val, prevVal) {
            let convIn = prevVal;
            if (line.startsWith("<print>")) {
                if (debug)                     
                    outLog += `${val}\n`;
                else
                    console.log(val);       
            }
            if (line.startsWith("<input>")) {
                if (typeof(val) != "string") {
                    error (line,i,"Variable is not a string");                      
                }                
                return prompt(val);
            }
            if (line.startsWith("<at>")) {
                if (typeof(prevVal) != "object") {
                    error (line,i,"Variable is not a table");       
                }
                return prevVal[val];
            }
            if (line.startsWith("<set>")) {
                if (typeof(prevVal) != "object") {
                    error (line,i,"Variable is not a table");   
                }
                
                if (typeof(val) != "object")
                {
                    let tab = JSON.parse(JSON.stringify(prevVal));
                    tab.push(val);
                    return tab;
                }
                else
                {
                    if (!val || val.length != 2) {
                        error (line,i,"Wrong key value table for <set>");
                    }             
                    let tab = JSON.parse(JSON.stringify(prevVal));
                    tab[val[0]] = val[1];
                    return tab;
                }     
            }
            if (line.startsWith("<add>")) {
                return convIn + val;
            }
            if (line.startsWith("<sub>")) {
                return convIn - val;
            }
            if (line.startsWith("<mul>")) {
                return convIn * val;
            }
            if (line.startsWith("<div>")) {
                if (val == 0) {
                    error (line,i,"Division by 0");
                }
                return convIn / val;
            }
            if (line.startsWith("<eq>")) {
                return convIn == val;
            }
            if (line.startsWith("<neq>")) {
                return convIn != val;
            }
            if (line.startsWith("<les>") || line.startsWith("<less>")) {
                return convIn < val;
            }
            if (line.startsWith("<mor>") || line.startsWith("<more>")) {
                return convIn > val;
            }
            if (line.startsWith("<lesq>") || line.startsWith("<lessq>")) {
                return convIn <= val;
            }
            if (line.startsWith("<morq>") || line.startsWith("<moreq>")) {
                return convIn >= val;
            }
            if (line.startsWith("<tonum>")) {
                return parseFloat(val)
            }
            if (line.startsWith("<toarr>")) {
                return Array.from(val);
            }
            if (line.startsWith("<tostr>")) {
                if (typeof(val) == "object") {
                    let out = "";
                    for (const v of val) {
                        out += v
                    }
                    return out;
                }
                else
                    return toString(val);
            }
        }
        function valBlockDebug(i, val) {
            let debugLines = debugCode.split("\n");
            debugLines[i] = debugLines[i].replace(/(?<=\[).*(?=\])/, val);
            debugCode = debugLines.join("\n");
        }
        function doDebug(i,val,prevVal) { 
            let logAll = "";
            if (breakpoints.includes(`${i + 1}`)) {
                breakpoint = true;
            }

            if (val == undefined) {
                val = "NULL";
            }
            if (prevVal == undefined) {
                prevVal = "NULL";
            }
            if (tpIn[i] == undefined) {
                prevVal = "NULL";
            }
            else if(!tpIn[i].sendSignal)
            {
                let tp = findTp(tpOut,tpIn[i].name);
                if (tp) {
                    prevVal = tp.value;                    
                }
            }
            logAll += outLog + "\n";
            logAll += "-------------------\n";

            let debugLines = debugCode.split("\n")

            let start = i - 5
            let end = i + 5;

            for (let j = start; j <= end; j++) {
                let max = Math.floor(Math.log10(debugLines.length) + 1);
                if (j >= debugLines.length || j < 0) {
                    let line = "";
                    for (let l = 0; l <= max; l++) {
                        line = " " + line;
                    }
                    logAll += line + "\n";
                    continue;
                }                
                let line = debugLines[j];
                let here = Math.floor(Math.log10(j + 1) + 1);

                line = line.replace(/\[(.*?)\]/,"\u001b[34m[\u001b[31m$1\u001b[34m]\u001b[0m")
                if (j == i) {
                    line = "\u001b[31m>\u001b[0m" + line;
                }
                else {
                    line = " " + line;
                }
                for (let l = 0; l <= max - here; l++) {
                    line = " " + line;
                }
                line = "\u001b[1;33m" + (j + 1) + "\u001b[0m" + line;
                line = line.replace(/(\#.+?)((\/\/)|$)/m,"\u001b[35m$1\u001b[0m$2")
                line = line.replace(/(\<\-|\-\>|\<\<)/,"\u001b[36m$1\u001b[0m")
                line = line.replace(/(\<.*?\>)/,"\u001b[34m$1\u001b[0m")
                line = line.replace(/(?<a>.*?)(?<place>)(?<b>\/\/.*)/,"$<a>\u001b[3;32m$<b>\u001b[0m")
                logAll += line + "\n"
            }
            logAll += "-------------------" + "\n";
            logAll += `VALUE: ${val}` + "\n";
            logAll += `SIDE VAL: ${prevVal}` + "\n";
            logAll += "-------------------" + "\n";
            logAll = "\033[0J" + logAll.replace("\n", "\n\033[0J");
            //console.log("\033[2J") //Clear screen            
            console.log(logAll);
            if (breakpoint) {                
                let p = prompt(`Enter - next line | C - continue | > `);
                if (p == "c" || p == "C") {
                    breakpoint = false;
                }
            }
            console.log("\033[0;0H"); // Go to first line
            maxLogHeight = Math.max(maxLogHeight, logAll.split("\n").length);
            
        }
        function execute(lines, lineNum, val = undefined) {    
            let prevVal = undefined;
            for (let i = lineNum; i < lines.length; i++) {
                let line = lines[i];
                line = line.trim();
                if (line == "")
                    return;                    

                
                if (line.startsWith("="))
                    val = undefined;                
                
                if (line.startsWith("?"))
                {
                    if (val) {                
                        if (tpOut[i] != undefined) {
                            tpOut[i].value = val;
                            let tp = findTp(tpIn,tpOut[i].name);    
                            let l = tpIn.indexOf(tp);                            
                            if (tp != undefined) {                                          
                                if (tp.sendSignal) {
                                    execute(lines, l, val);
                                }
                                else {
                                    error (line,i,"Cannot jump from Line ${i}. Use << instead of <-");
                                }
                            }
                            else {
                                error (line,i,`${tpOut[i].name} doesn't have an teleport in (<- / <<) with the same name`);
                            }
                        }
                        else {
                            error (line,i,"No conditional destination");
                        }
                        return;
                    }
                    else
                        continue;
                }
                if (vars[i] != undefined) {
                    if (val == undefined)
                        val = vars[i];
                    else
                    {
                        vars[i] = val;
                        if (debug) {
                            valBlockDebug(i, val);
                        }
                    }
                }
                
                if (debug) {
                    doDebug(i, val, prevVal);
                }
                
                if (tpOut[i] != undefined) {
                    tpOut[i].value = val;
                    let tp = findTp(tpIn,tpOut[i].name);
                    if (tp != undefined) {                
                        let l = tpIn.indexOf(tp);
                        if (tp.sendSignal) {
                            execute(lines, l, val);
                        }
                    }
                    else
                        error (line,i,`${tpOut[i].name} doesn't have an teleport in (<- / <<) with the same name`);
                }
                prevVal = val;
                if (tpIn[i] != undefined) {
                    if (!tpIn[i].sendSignal) {
                        let tp = findTp(tpOut,tpIn[i].name);     
                        if (tp == undefined) {
                            error (line,i,`${tpIn[i].name} doesn't have an teleport out (->) with the same name`);
                        }
                        val = tp.value         
                    }
                }               

                let ret = checkFunctions(line, i, val, prevVal);
                if (ret != undefined) {
                    val = ret;
                }
            }
        }
        if (starts.length == 0) {
            console.error(`WARNING: No program start "!" found.`);                        
        }
        for (let st of starts) {
            execute(lines, st.line);
        }  
    } catch (error) {
        console.error(error);
    }
    if (debug) {
        console.log("\033["+maxLogHeight+";0H");    
    }
}
main();    