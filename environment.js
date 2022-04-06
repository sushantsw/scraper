const environment = {
  apiUrl: 'http://localhost:3000/api/',
  // apiUrl: 'http://ec2co-ecsel-1jy3u5xjegjgd-771036687.us-east-2.elb.amazonaws.com/api/',
  cognitoUrl: 'https://cognito-idp.us-east-2.amazonaws.com/',
  cognitoClientId: '5tt5ioq8rpvo29l8lbl78mtrkq',
  site: 'PINTEREST',
  accountType: 'cooking',
  postPerSearch: 10
}

exports.env = environment;