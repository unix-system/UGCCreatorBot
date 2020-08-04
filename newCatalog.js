const fetch = require('node-fetch');
const sleep = require('sleep');
const fs = require('fs');

const db = require('./database');
const attr = require('dynamodb-data-types').AttributeValue;

function pullCatalogPageTop(cursor) { 
    return new Promise((resolve, reject) => {
        let url = 'https://catalog.roblox.com/v1/search/items/details?Category=13&SortType=4&IncludeNotForSale=true&Limit=30&SortAggregation=5';

        if (cursor !== "" && cursor) {
            url += '&Cursor=' + cursor;
        }
    
        fetch(url)
        .then(data => data.json())
        .then(function(data) {
            if (data && data.data) {
                resolve({ data: data.data, cursor: data.nextPageCursor });
            } else {
                reject("Didn't find data: " + JSON.stringify(data));
            }
        }).catch(reject);
    })
}
function pullCatalogPageBottom(cursor) { 
    return new Promise((resolve, reject) => {
        let url = 'https://catalog.roblox.com/v1/search/items/details?Category=13&SortType=5&IncludeNotForSale=true&Limit=30&SortAggregation=5';

        if (cursor !== "" && cursor) {
            url += '&Cursor=' + cursor;
        }
    
        fetch(url)
        .then(data => data.json())
        .then(function(data) {
            if (data && data.data) {
                for (const key in data) {
                    const element = data[key];
                    if (element && typeof(element) === "object" && element.length === 0) {
                        console.log("length 0")
                        delete data[key];
                    }
                }
                resolve({ data: data.data, cursor: data.nextPageCursor });
            } else {
                reject("Didn't find data: " + JSON.stringify(data));
            }
        }).catch(reject);
    })
}

function formatPullToDbBulk(pull) {
    let normalised = [];
    for (const obj of pull) {
        normalised.push(attr.wrap({id: obj.id}));
    }
    return normalised;
}

function convertToDict(data) {
    let dict = {};

    for (const item of data) {
        
        const d = attr.unwrap(item);
        if (d.id !== null) {
            if (d.creatorTargetId !== 1) {
                dict[d.id] = d;
            }
        }
    }

    return dict
}

function compareKeys(a, b) {
    let compare = {};
    for (const key in a) {
        const element = a[key];
        const compareElement = b[key];

        if (Array.isArray(element) || Array.isArray(compareElement)) {
            continue;
        }
        if (element === undefined) {
            compare[key] = { type: 'add', old: "-", new: compareElement }
        } else if (compareElement === undefined) {
            compare[key] = { type: 'remove', old: element, new: "-" }
        } else if (compareElement != element) {
            if (typeof(compareElement) === "object" && typeof(element) === "object") {
                if (JSON.stringify(compareElement) !== JSON.stringify(element)) {
                    compare[key] = { type: 'change', old: element, new: compareElement }
                }
            } else {
                compare[key] = { type: 'change', old: element, new: compareElement }
            }
        }
    }
    if (compare.length === 0 || compare === {}) {
        return
    } else {
        return compare;
    }
}

function comparePullToDb(pull) {
    return new Promise( (resolve,reject) => {

        let newItems = [];
        let changes = [];

        db.bulkGet('UGCItemData', formatPullToDbBulk(pull)).then(function(dbData) {
            if (dbData && dbData.Responses && dbData.Responses["UGCItemData"]) {
                const dictDb = convertToDict(dbData.Responses["UGCItemData"]);
                for (const obj of pull) {
                    if (dictDb[obj.id]) {
                        const comparator = compareKeys(dictDb[obj.id], obj);
                        if (comparator) {
                            //console.log(comparator);
                            changes.push({ 
                                id: obj.id,
                                compare: comparator
                            });
                        }
                    } else {
                        console.log('New UGC item found');
                        newItems.push(obj);
                    }
                }
            }
            resolve({newData: newItems, changedData: changes});
        }).catch(reject);
    })
}

async function runUpdateFunction(changedData) {
    for (const item of changedData) {
        for (const key in item.compare) {
            let updateFormat = {
                UpdateExpression: "set #k = :v",
                ExpressionAttributeValues: {
                    ":v": item.compare[key].new,
                },
                ExpressionAttributeNames: {
                    "#k": key
                }
            };
            await db.update('UGCItemData', { id: item.id }, updateFormat);
            sleep.msleep(500); // DB won't die
        }
    }
}

function siftData(pullFunction, resolve, dict, cursor, length) {
    if (!length) {
        length = 0;
    }
    if (!dict) {
        dict = [];
    }
    pullFunction(cursor).then(function(data) {
        length += data.data.length;
        comparePullToDb(data.data).then(function(recieve) {
            let newData = recieve.newData;
            let changedData = recieve.changedData;
            if (newData && newData.length > 0) {
                let toPush = [];
                for (const item of newData) {

                    dict.push({ type: 'new', data: item });
                    let pushData = {
                        PutRequest: {
                            Item: {}
                          }
                    }
                    
                    pushData.PutRequest.Item = attr.wrap(item);
                    for (const key in pushData.PutRequest.Item) {
                        const obj = pushData.PutRequest.Item[key];
                        if (obj && obj.NS && obj.NS.length === 0) {
                            delete pushData.PutRequest.Item[key];
                        }
                    }

                    toPush.push(pushData);
                    if (toPush.length === 25) {
                        db.bulkSet('UGCItemData', toPush).then(function(d) {
                            //console.log(d);
                        }).catch(console.log);
                        toPush = [];
                    }
                }
                if (toPush.length > 0) {
                    db.bulkSet('UGCItemData', toPush).then(function(d) {
                        //console.log(d);
                    }).catch(console.log);
                }
            }
            if (changedData && changedData.length > 0) {
                runUpdateFunction(changedData);
                for (const item of changedData) {
                    dict.push({ type: 'update', data: item });
                }
            }
            if (!data.cursor) {
                resolve(dict);
            }
        }).catch(console.warn);
        return data;
    }).then(function(data) {
        if (data.cursor) {
            sleep.msleep(500); // DB won't die
            siftData(pullFunction, resolve, dict, data.cursor, length);
        }
    }).catch(function(err) {
        console.log("Some kind of data error: " + err)
        siftData(pullFunction, resolve, dict, cursor, length);
    })
}

function getCatalog() {
    return new Promise( (resolve, reject) => {
        siftData(pullCatalogPageTop, function(dataA) {
            siftData(pullCatalogPageBottom, function(dataB) {
                resolve(dataA.concat(dataB));
            });
        });
    })
}

module.exports = new class Catalog {
    async runCatalog() {
        return await getCatalog();
    }
}