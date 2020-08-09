var AWS = require("aws-sdk");

AWS.config.update({
    endpoint: "https://dynamodb.eu-west-2.amazonaws.com",
    region: 'eu-west-2'
});

let docClient;
let dbClient;

AWS.config.getCredentials(function(err) {
  if (err) console.log(err.stack);
  else {
    docClient = new AWS.DynamoDB.DocumentClient();
    dbClient = new AWS.DynamoDB();
  }
});




module.exports = new class db {

    get(table, key) {
        return new Promise( (resolve,reject) => {
            const params = {
                TableName: table,
                Key: key
            };
            docClient.get(params, function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    update(table, key, expression) {
        return new Promise( (resolve,reject) => {
            expression.TableName = table;
            expression.Key = key;
            expression.ReturnValues = "UPDATED_NEW";
            docClient.update(expression, function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    async scan(tableName) {
        let list = [];
        let params = {
            TableName: tableName
        };
        return new Promise((resolve, reject) => {
            function onScan(err, data) {
                if (err) {
                    return reject(err);
                } else {
                    console.log("Scan succeeded.");
                    console.log(data.Items.length);
                    data.Items.forEach(function(item) {
                        list.push(item);
                    });
                    if (typeof data.LastEvaluatedKey != "undefined") {
                        console.log("Scanning for more...");
                        params.ExclusiveStartKey = data.LastEvaluatedKey;
                        docClient.scan(params, onScan);
                    } else {
                        return resolve(list);
                    }
                }
            }
            docClient.scan(params, onScan);
        })
    
    }
    

    bulkGet(table, keys, projection) {
        return new Promise( (resolve,reject) => {
            let params = {
                RequestItems: {}
            };

            params.RequestItems[table] = {
                Keys: keys,
                ProjectionExpression: projection
            }


            dbClient.batchGetItem(params, function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    bulkSet(table, keys) {
        return new Promise( (resolve,reject) => {
            let params = {
                RequestItems: {}
            };

            params.RequestItems[table] = keys;
            
            dbClient.batchWriteItem(params, function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

}