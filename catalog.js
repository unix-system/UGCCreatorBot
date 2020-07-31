// https://catalog.roblox.com/v1/search/items?category=CommunityCreations&limit=60&subcategory=CommunityCreations

const fetch = require('node-fetch');
const sleep = require('sleep');

const db = require('./database');

const dataFormat = {
    "AssetId": "asset_id",
    "ProductId": "product_id",
    "Name": "name",
    "Description": "desc",
    "AssetType": "asset_type",
    "ProductType": "product_type",
    "Created": "created_date",
    "Updated": "updated_date",
    "PriceInRobux": "robux",
    "Sales": "sales_count",
    "IsForSale": "for_sale",
}

const exemptData = {
    "sales_count": true,
    "updated_date": true
}

async function getNormalisedMarketData(assetId) {
    try {
        const response = await fetch(`https://api.roblox.com/marketplace/productinfo?assetId=${assetId}`);
        if (response) {
            const data = await response.json();
            let normalData = {};
    
            for (const key in data) {
                if (dataFormat[key]) {
                    normalData[dataFormat[key]] = data[key];
                }
            }
    
            normalData["creator_id"] = data.Creator.Id;
            normalData["asset_id"] = assetId;
    
            return normalData;
        }
    } catch (error) {
    }
    return
}

async function normaliseDbData(data) {
    let normalData = {};

    for (const key in data) {
        const element = data[key];
        if (element.N) {
            normalData[key] = parseInt(element.N);
        } else {
            console.log(element);
            normalData[key] = element.S;
        }
    }

    return normalData;
}

async function crawlCatalog() {
    let newEntries = {};
    let count = 0;
    let changedData = [];

    let currentCursor = "";
    
    while (currentCursor !== null) {
        try {
            let url = 'https://catalog.roblox.com/v1/search/items?category=CommunityCreations&limit=100&subcategory=CommunityCreations';
            if (currentCursor !== "" && currentCursor !== null) {
                url += '&cursor=' + currentCursor;
            }
            const response = await fetch(url);
            if (response) {
                const data = await response.json();

                if (data && data.data) {
                    currentCursor = data.nextPageCursor;
                    let normalisedData = [];
                    for (const asset of data.data) {
                        normalisedData.push({
                            'asset_id': {N: asset.id.toString()}
                        })
                    }

                    const dbData = await db.bulkGet('UGCItemData', normalisedData);
                    if (dbData && dbData.Responses && dbData.Responses.UGCItemData) {
                        for (const asset of data.data) {
                            let isIn = false;
                            let pulledData;
                            for (const dbAsset of dbData.Responses.UGCItemData) {
                                if (dbAsset.asset_id && dbAsset.asset_id.N === asset.id.toString()) {
                                    isIn = true;
                                    pulledData = await normaliseDbData(dbAsset);
                                    break;
                                }
                            }
                            if (isIn) {
                                console.log("IsIn");
                                let marketData = await getNormalisedMarketData(asset.id);
                                let changes = {};
                                if (marketData) {
                                    console.log("got market data");
                                    console.log(pulledData);
                                    for (const key in marketData) {
                                            const element = marketData[key];
                                            if (!(key in exemptData) && pulledData[key] !== element) {
                                                console.log("Change detected!");;
                                                console.log(`${key} changed from '${pulledData[key]}' to '${element}'`);
                                                changes[key] = {before: pulledData[key], after: element};
                                            }
                                        }
                                    }
                                if(changes === {}) {
                                    console.log("No change detected");
                                } else {
                                    changedData.push({ id: asset.id, changes: changes });
                                }
                            } else {
                                count++;
                                newEntries[asset.id.toString()] = {};
                            }
                        }
                    }
                }
                sleep.sleep(1);
            } else {
                console.warn("No response!")
            }
            
        } catch (error) {
            console.log(error);
        }
    }

    let toPush = [];
    let pushCount = 0;

    for (const assetId in newEntries) {
        const data = await getNormalisedMarketData(assetId); 
        if (data) {
            let pushData = {
                PutRequest: {
                    Item: {}
                  }
            }
            for (const key in data) {
                const element = data[key];
                if (typeof(element) === "string") {
                    pushData.PutRequest.Item[key] = { "S": element }
                } else if (typeof(element) === "number") {
                    pushData.PutRequest.Item[key] = { "N": element.toString() }
                } else if (typeof(element) === "boolean") {
                    pushData.PutRequest.Item[key] = { "B": element.toString() }
                }
            }
            pushData.PutRequest.Item['asset_id'] = { "N": data['asset_id'].toString() }
            toPush.push(pushData);
            pushCount++;
            if (pushCount >= 20) {
                await db.bulkSet('UGCItemData', toPush);
                pushCount = 0;
                toPush = [];
            }
            sleep.sleep(1);
        }
    }
    if (pushCount > 0) {
        await db.bulkSet('UGCItemData', toPush);
        pushCount = 0;
        toPush = [];
    }
    if (changedData.length > 0) {
        for (const data of changedData) {
            for (const key in data.changes) {
                console.log(data.changes[key]);
                let updateFormat = {
                    UpdateExpression: "set #k = :v",
                    ExpressionAttributeValues: {
                        ":v": data.changes[key].after,
                    },
                    ExpressionAttributeNames: {
                        "#k": key
                    }
                };
                
                let d = await db.update('UGCItemData', { asset_id: data.id }, updateFormat);
                console.log(d);
            }
        }
    }
}

crawlCatalog();