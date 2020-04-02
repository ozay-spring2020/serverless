const AWS = require('aws-sdk');
const ses = new AWS.SES();
const dynamoDB = new AWS.DynamoDB();
const route53 = new AWS.Route53();
const logger = log4js.getLogger('logs');
AWS.config.update({ region: 'us-east-1' });

exports.handler = (event, context) => {
    console.log('Received event:', JSON.stringify(event, null, 4));
    logger.info('Received event:', JSON.stringify(event, null, 4))
    const details = JSON.parse(event.Records[0].Sns.Message);
    logger.info(details)
    //console.log('Message received from SNS:', details);
    const email = details[0].email;
    //console.log('Email:', email);
    let billList = [];

    const getItemObject = {
        TableName: 'csye6225',
        Key: {
            'id': { S: email }
        }
    };

    dynamoDB.getItem(getItemObject, (err, data) => {
        if (data.Item === undefined || data.Item.ttl.N < Math.floor(Date.now() / 1000)) {
            const putItemObject = {
                TableName: 'csye6225',
                Item: {
                    id: { S: email },
                    token: { S: context.awsRequestId },
                    ttl: { N: (Math.floor(Date.now() / 1000) + 180).toString() }
                }
            };
            logger.info("time to live = "+ttl)
            logger.info(putItemObject);
            dynamoDB.putItem(putItemObject, () => { });


                let domainName = process.env.DOMAIN_NAME

                details.forEach(element => billList.push(" \n http://" + domainName + "/v1/bill/" + element.billid + "\n"));
                let arr = billList.toString();
                console.log('Bill Links:', arr);
                logger.info('Bill Links:', arr)

                const emailObject = {
                    Destination: {
                        ToAddresses: [email]
                    },
                    Message: {
                        Body: {
                            Text: {
                                Data: "Click below links to view Bills: \n " + arr
                            }
                        },
                        Subject: {
                            Data: "Get your Bills!"
                        }
                    },
                    Source: process.env.FROM_EMAIL
                };
                ses.sendEmail(emailObject, (err, data) => {
                    if (err) {
                        console.log(err.message);
                        logger.error(err.message)
                    } else {
                        logger.info("Email sent!,Message ID: ", data.MessageId)
                        console.log("Email sent! Message ID: ", data.MessageId);
                    }
                });
        }
    });
};