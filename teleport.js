const prompt = require("prompt-sync")({ sigint: true });  
const fs = require('fs');
async function main() {
    try{
        let path = process.argv[2];// || "./fibonaci.factory";
        if (path == undefined) {
            throw "ERROR: No file provided.";
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
        let vars = [];
        let tpIn = [];
        let tpOut = [];
        let starts = [];
        let regex = /\/\/.*\n/g;
        code = code.replace(/\r\n/g,"\n");
        code += "\n"; // don't ask
        code = code.replace(regex, "\n") //wywal komentarze
        let lines = code.split("\n");
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            line = line.trim();

            if (line == "") 
                continue;
            

            if (line.startsWith("[")) {
                let val = line.split("[")[1].split("]")[0];
                
                if (val == '') {
                    throw `ERROR Line ${i+1}: No value found inside square brackets.`;                    
                }
                if (!line.includes("]")) {
                    throw `ERROR Line ${i+1}: No closing bracket.`;                    
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
                throw `ERROR Line ${i+1}: Invalid character.`;    
            }
                
            let arrowCount = 0
            if (line.includes("->")) {
                arrowCount++;
                let tpName = line.split("#")[1];
                if (tpName == undefined) {
                    throw `ERROR Line ${i+1}: "#" symbol missing after ->.`;                    
                }

                tpOut[i] = {name: tpName, value: undefined};
            }
            if (line.includes("<-")) {
                arrowCount++;
                let tpName = line.split("#")[1];
                if (tpName == undefined) {
                    throw `ERROR Line ${i+1}: "#" symbol missing after <-.`;                    
                }

                tpIn[i] = {name: tpName, sendSignal: false};
            }
            if (line.includes("<<")) {
                arrowCount++;
                let tpName = line.split("#")[1];
                if (tpName == undefined) {
                    throw `ERROR Line ${i+1}: "#" symbol missing after <<.`;                    
                }
                
                tpIn[i] = {name: tpName, sendSignal: true};
            }
            
            if (line.includes("#") && arrowCount == 0) {
                throw `ERROR Line ${i+1}: arrow missing before "#" symbol.`;                   
            }

            if (arrowCount != 1 && arrowCount != 0) {
                throw `ERROR Line ${i+1}: too many arrows.`;                      
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
                console.log(val);       
            }
            if (line.startsWith("<input>")) {
                return prompt(val);
            }
            if (line.startsWith("<at>")) {
                if (typeof(prevVal) != "object") {
                    throw `ERROR Line ${i+1}: Variable is not a table`;
                }
                if (prevVal[val] == undefined) {
                    throw `ERROR Line ${i+1}: Wrong table index / key`;
                }
                return prevVal[val];
            }
            if (line.startsWith("<set>")) {
                if (typeof(prevVal) != "object") {
                    throw `ERROR Line ${i+1}: Variable is not a table`;
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
                        throw `ERROR Line ${i+1}: Wrong key value table for <set>`;
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
                    throw `ERROR Line ${i+1}: Division by 0`;
                }
                return convIn / val;
            }
            if (line.startsWith("<eq>")) {
                return convIn == val;
            }
            if (line.startsWith("<neq>")) {
                return convIn != val;
            }
            if (line.startsWith("<les>")) {
                return convIn < val;
            }
            if (line.startsWith("<mor>")) {
                return convIn > val;
            }
            if (line.startsWith("<lesq>")) {
                return convIn <= val;
            }
            if (line.startsWith("<morq>")) {
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
                            if (tp.sendSignal) {
                                execute(lines, l, val);
                            }
                            else
                                throw `ERROR Line ${l+1}: Cannot jump from Line ${i}. Use << instead of <-`;
                        }
                        else {
                            throw `ERROR Line ${i+1}: No conditional destination`;
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
                        vars[i] = val;
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
                }
                prevVal = val;
                if (tpIn[i] != undefined) {
                    if (!tpIn[i].sendSignal) {
                        let tp = findTp(tpOut,tpIn[i].name);     
                        if (tp == undefined) {
                            throw `ERROR Line ${i+1}: ${tpIn[i].name} doesn't have an tpOut with the same name`;
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
        for (let st of starts) {
            execute(lines, st.line);
        }  
    } catch (error) {
        console.error(error);
    }
}
main();    