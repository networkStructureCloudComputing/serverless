const aws = require("aws-sdk");
const ses = new aws.SES({
    region: "us-east-1"
});

const dynamo = new aws.DynamoDB({
    region: "us-east-1"
})
const DynamoDB = new aws.DynamoDB.DocumentClient({
    service: dynamo
});

exports.handler = (event, context, callback) => {
    let msg = JSON.parse(event.Records[0].Sns.Message);
    if (!msg.verified) {
        let searchParams = {
            TableName: "dynamo_email",
            Key: {
                "username": msg.username
            }
        };
        DynamoDB.get(searchParams, function (error, record) {
            if (error) {
                console.log("Error in DynamoDB get method ", error);
            } else {
                if (!record.Item.isSend) {
                    const params = {
                        TableName: "dynamo_email",
                        Key: {
                            "username": msg.username
                        },
                        UpdateExpression: "set #MyVariable = :x",
                        ExpressionAttributeNames: {
                            "#MyVariable": "isSend"
                        },
                        ExpressionAttributeValues: {
                            ":x": true
                        }
                    };
                    DynamoDB.update(params, function (err, data) {
                        if (err) console.log(err);
                        else console.log(data);
                    });
                    sendEmail(msg);
                } else {
                    console.log('Verification Mail Already Send to email: ' + msg.username);
                }
            }
        });
    }
}

var sendEmail = (data) => {

    let link = `https://${data.domainName}/v1/verifyUserEmail?email=${data.username}&token=${data.token}`;
    let body = `<html><body>Hi ${data.first_name},<br> Your profile has been created successfully on our application. You need to verify your email address before using your account by clicking on this link: <br><br><a href=${link}>Verify your account</a><br><br><br> Kind Regards,<br> <strong>${data.domainName}<strong></body></html>`
    let from = "noreply@" + data.domainName
    let emailBody = {
        Destination: {
            ToAddresses: [data.username],
        },
        Message: {
            Body: {
                Html: {
                    Data: body
                },
            },
            Subject: {
                Data: "User Account Verification Email"
            },
        },
        Source: from,
    };

    let sendEmailProm = ses.sendEmail(emailBody).promise()
    sendEmailProm
        .then(function (result) {
            console.log(result);
        })
        .catch(function (err) {
            console.error(err, err.stack);
        });
}
