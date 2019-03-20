import * as Aws from 'aws-sdk';
const dynamo = new Aws.DynamoDB.DocumentClient();

let tableName:string = '';
if (process.env.TABLE_NAME) {
    tableName = process.env.TABLE_NAME;
}

exports.handler = async() => {
    let param:Aws.DynamoDB.ScanInput = {
        TableName: tableName
    };

    let data:Aws.DynamoDB.ScanOutput = await dynamo.scan(param).promise();
    console.log(JSON.stringify(data));

    let response = {
        isBase64Encoded: false,
        statusCode: 200,
        headers: {},
        body: JSON.stringify(data)
    };
    return response;
}