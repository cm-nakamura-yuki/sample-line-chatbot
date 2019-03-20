import * as Aws from 'aws-sdk';
const dynamo = new Aws.DynamoDB.DocumentClient();

let tableName:string = '';
if (process.env.TABLE_NAME) {
    tableName = process.env.TABLE_NAME;
}

exports.handler = async(event:any) => {
    console.log(JSON.stringify(event));
    let productName = event.queryStringParameters.productName;
    let param:Aws.DynamoDB.DocumentClient.GetItemInput = {
        TableName: tableName,
        Key: {
            productName: productName
        }
    } 

    let data:Aws.DynamoDB.GetItemOutput = await dynamo.get(param).promise();
    console.log(JSON.stringify(data));

    let response = {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {},
        body: JSON.stringify(data)
    };
    return response;
}