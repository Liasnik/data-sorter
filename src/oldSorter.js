const butt_replase = document.querySelector('#btn-replace');
 butt_replase.addEventListener('click', replaceName);


const butt_replase2 = document.querySelector('#btn-replace-2');
butt_replase2.addEventListener('click', replaceName2);


const button_two_areas = document.querySelector('#btn-two-areas');
button_two_areas.addEventListener('click', splitList);

const button_strict_begin = document.querySelector('#btn-strict-begin');
button_strict_begin.addEventListener('click', splitAtBeginning);

const button_strict_inner_cell = document.querySelector('#btn-strict-inner-values');
button_strict_inner_cell.addEventListener('click', splitByCellInnerValue);

const button_strict_end = document.querySelector('#btn-strict-end');
button_strict_end.addEventListener('click', splitAtEnding);

const button_with_keywords= document.querySelector('#btn-with-keywords');
button_with_keywords.addEventListener('click', createWithKeys);

const button_without_keywords = document.querySelector('#btn-without-keywords');
button_without_keywords.addEventListener('click', createWithoutKeys);

const input_keywords = document.querySelector('#input-keywords');
input_keywords.value = JSON.parse(localStorage.getItem('key'));

const input_replace = document.querySelector('#input-replace');
// input_replace.value = JSON.parse(localStorage.getItem('key2'));

const incoming_list = document.querySelector('#incoming-list');
incoming_list.value = JSON.parse(localStorage.getItem('text'));

const areaWithKey = document.querySelector('#with-keywords');

const areaWithoutKey =document.querySelector('#without-keywords');

function arrKey() {
    const keyWord = input_keywords.value.trim();

    localStorage.setItem('key', JSON.stringify(keyWord));
    
    const arrayKeywords = keyWord.split(' ');

 return arrayKeywords;
}

function getArrayNewValues() {
    const newValue = input_replace.value.trim()
    if (!newValue) {
        alert('Введи заменители!');
        return
    } 
    const arrayNewValues = newValue.split(' ');
    return arrayNewValues
}

function arrText() {
    const inText = incoming_list.value;
    
    //localStorage.setItem('text', JSON.stringify(inText));

    const arrayFromString = inText.split('\n');
    const uniqArr = [...new Set(arrayFromString)];

     return uniqArr;
}

function splitAtBeginning() {
    const arrayKeywords = arrKey(); 
    const uniqArray = arrText();

    const newArray = uniqArray.filter(item => { 
        return arrayKeywords.some(allowed => {
         return item.includes(`\t${allowed}`)
        })
    });

     const listWith = newArray.join('\n'); 
     
     areaWithKey.value = `${listWith}\n`;

    const newArray2 = uniqArray.filter(item => { 
        return !arrayKeywords.some(forbidden => {
         return item.includes(`\t${forbidden}`)
        })
    });
      
    const listWithout = newArray2.join('\n');

    areaWithoutKey.value = listWithout;
}

function splitByCellInnerValue() {
    const arrayKeywords = arrKey(); 
    const uniqArray = arrText();

    const newArray = uniqArray.filter(item => { 
        return arrayKeywords.some(allowed => {
         return item.includes(` ${allowed} `)
        })
    });

     const listWith = newArray.join('\n'); 
     
     areaWithKey.value = `${listWith}\n`; 

    const newArray2 = uniqArray.filter(item => { 
        return !arrayKeywords.some(forbidden => {
         return item.includes(` ${forbidden} `)
        })
    });
      
    const listWithout = newArray2.join('\n');

    areaWithoutKey.value = listWithout;
}

function splitAtEnding() {
    const arrayKeywords = arrKey(); 
    const uniqArray = arrText();

    const newArray = uniqArray.filter(item => { 
        return arrayKeywords.some(allowed => {
         return item.includes(`${allowed}\t`)
        })
    });

     const listWith = newArray.join('\n'); 
     
     areaWithKey.value = `${listWith}\n`;

    const newArray2 = uniqArray.filter(item => { 
        return !arrayKeywords.some(forbidden => {
         return item.includes(`${forbidden}\t`)
        })
    });
      
    const listWithout = newArray2.join('\n');

    areaWithoutKey.value = listWithout;
}

function splitList() {
    createWithKeys();
    createWithoutKeys(); 
}

function createWithKeys() {
    const arrayKeywords = arrKey(); 
    const uniqArray = arrText();
    
    const newArray = uniqArray.filter(item => { 
          return arrayKeywords.some(allowed => {
           return item.toUpperCase().includes(allowed.toUpperCase())
          })
    });
        
     const listWithout = newArray.join('\n'); 
     areaWithKey.value = listWithout;
}

function createWithoutKeys() {
    const arrayKeywords = arrKey(); 
    const uniqArray = arrText();

    const newArrey = uniqArray.filter(item => { 
          return !arrayKeywords.some(forbidden => {
           return item.toUpperCase().includes(forbidden.toUpperCase())
          })
    });
 
     const listWithout = newArrey.join('\n'); 
     areaWithoutKey.value = listWithout;
}

// ======== Замена слов =============

function replaceName() {
    const arrayKeywords = arrKey(); 
    const uniqArray = arrText();
    const arrayNewValues = getArrayNewValues()  
    // const newValues = document.querySelector('#input-replace').value.trim();
    
    // const arrayNewValues = newValues.split(' ');
    function replaceValues() {    
        if (arrayKeywords.length !== arrayNewValues.length) {
           alert('Разное количество введённых значений! Введите корректные данные!')
           return
        } 
            {      
                for (let i = 0; i < arrayKeywords.length; i++) {
                    for (let j = 0; j < uniqArray.length; j++) {
                        uniqArray[j] = uniqArray[j].replace(
                            `${arrayKeywords[i]} `,
                            `${arrayNewValues[i]} `
                        )
                        uniqArray[j] = uniqArray[j].replace(
                            `${arrayKeywords[i]}\t`,
                            `${arrayNewValues[i]}\t`
                        )                     
                    }
                }
            }
        return uniqArray;
    }

    const newArr = replaceValues();
    const newArray = newArr.join('\n');
   
    document.querySelector('#with-keywords').value = newArray;
}

function replaceName2() {
    const arrayKeywords = arrKey(); 
    const uniqArray = arrText();
    const arrayNewValues = getArrayNewValues() 

    function replaceValues2(array, targetArr, replacementArr) {
        if (targetArr.length !== replacementArr.length) {
           alert('Разное количество введённых значений! Введите корректные данные!')
           return
        } else {     
                for (let i = 0; i < targetArr.length; i++) {
                    for (let j = 0; j < array.length; j++) {
                        array[j] = array[j].toUpperCase().replace(
                            `${targetArr[i].toUpperCase()}\t`,
                            `${replacementArr[i]}\t`
                        )
                        array[j] = array[j].toUpperCase().replace(
                            `${targetArr[i].toUpperCase()} `,
                            `${replacementArr[i]} `
                        )
                    }
                }
            }
        return array;
    }
 
    const newArr2 = replaceValues2(uniqArray, arrayKeywords, arrayNewValues);
    const newArray2 = newArr2.join('\n');
 
    document.querySelector('#with-keywords').value = newArray2;
}

// ===========  clear local Sturage =============

document.getElementById('del').onclick = function() {
    localStorage.clear('key');
 }  



