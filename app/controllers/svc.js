const request         = require('request-promise');

const debug           = require('debug')('app:svcController');
const { blue, green } = require('chalk');

const Report          = require('../models/reportModel');

const { dataPackages } = require('../data');

const { basicCheckItems } = require('../data');


const requestOptions = (uri, vrm) => {
 return {
   method: 'GET',
   uri: uri,
   qs: {
     v: 2,
     api_nullitems: 1,
     auth_apikey: process.env.UKVD_API_KEY,
     key_VRM: vrm
   },
   json: true,
   resolveWithFullResponse: true
  }
};

const env = process.env.NODE_ENV;



/**
 * GET /full/:registration
 * VdiCheckFull by VRM.
 */
exports.getVdiFullCheck = (req, res, next) => {
  req.assert('registration', 'Registration is not valid').isAlphanumeric();

  const errors = req.validationErrors();

  const requestOptions = requestOptions(process.env.UKVD_API_URL_VdiCheckFull, req.params.registration);

  if (errors) {
    return res.status(400).json({ msg: errors[0].msg });
  }

  request(requestOptions)
    .then((result) => {
      const {
        StatusMessage,
        StatusCode,
        DataItems
      } = result.body.Response;

      debug(`${blue('UKVD:')} ${StatusMessage}`);
      if (StatusCode !== 'Success') throw new Error(StatusCode);

      return { msg: StatusCode, data: DataItems };
    })
    .then(result => res.status(200).json(result))
    .catch(err => res.status(500).json({ msg: err.message, data: {} }));
};


/**
 * GET /fail
 * Mock UKVD fail response.
 */
exports.getDataFail = (req, res, next) => res.status(500).json({ msg: 'ServiceUnavailable', data: {} });


function requestTimeoutPromise(requestData, packageName, interval) {

    return new Promise((resolve, reject)=> {

        setTimeout(()=> {
            request(requestData)
                .then(result => {
                    let obj = {};
                    obj[packageName] = result.body.Response.DataItems;

                    resolve(obj);
                })
                .catch(error => {
                    reject(error);
                });
        }, interval * 500);

    });
}

/**
 * VdiFullCheck by VRM
 * return report
 */
exports.generateNewReport = (reportType, registration) => {
  let promises = [],
      requestURL = process.env.UKVD_API_URL_datapackage;


  if(reportType === 'Full') {

      dataPackages.forEach((packageName, index) => {

          let data = requestOptions(requestURL+packageName, registration);

          promises.push(
              requestTimeoutPromise(data, packageName, index)
          );

      });

      return Promise.all(promises)
            .then((result) => {
                let reportData = {};

                result.forEach(item => {
                    for(let key in item) {
                        reportData[key] = item[key];
                    }
                });

                return new Report({
                    reportType,
                    registration,
                    data: reportData,
                });
            })
            .catch(error => error);
  }
  else {
      let requestData = requestOptions(process.env.UKVD_API_URL_VdiCheckFull, registration);

      return request(requestData)
          .then(result => {
              return result.body.Response.DataItems;
          })
          .then((result)=> {
                let reportData =  baseCheckController(result);
                return new Report({
                  reportType,
                  registration,
                  data: reportData,
              });
          })
          .catch(error => error);
  }
};

const baseCheckController = (data) => {
    let baseCheck = {basic: {}};
    let index;

    for(let key in data) {
        index = basicCheckItems.findIndex(item => item === key);
        if (index >= 0) {
            baseCheck.basic[key] = data[key];
        }
    }

    return baseCheck;
};



/**
 * GET /summary/:registration
 * Summary info by VRM.
 */

exports.getVdiSummary = function (req, response) {

  let data = {},
   requestData = requestOptions(process.env.UKVD_API_URL_VehicleData, req.params.registration);
   requestIMGData = requestOptions(process.env.UKVD_API_URL_VehicleImageData, req.params.registration);

  request(requestData)
    .then((result) => {
      const {
        StatusMessage,
        StatusCode,
        DataItems
      } = result.body.Response;

      debug(`${blue('UKVD:')} ${StatusMessage}`);
      if (StatusCode !== 'Success') throw new Error(StatusCode);

      return { msg: StatusCode, data: DataItems };
    })
    .then(result => {
      data.make = result.data.VehicleRegistration.Make;
      data.model = result.data.VehicleRegistration.Model;
      data.colour = result.data.VehicleRegistration.Colour;
      data.year = result.data.VehicleRegistration.YearOfManufacture;
      data.vrm = req.params.registration;

      return request(requestIMGData);
    })
    .then((result) => {
      const {
        StatusMessage,
        StatusCode,
        DataItems
      } = result.body.Response;

      debug(`${blue('UKVD:')} ${StatusMessage}`);
      if (StatusCode !== 'Success') throw new Error(StatusCode);

      return { msg: StatusCode, data: DataItems };
    })
    .then(result => {
      data.img = result.data.VehicleImages.ImageDetailsList[0].ImageUrl;
      return { msg: result.msg, data: data };
    })
    .then(result => response.status(200).json(result))
    .catch(err => response.status(500).json({ msg: err.message, data: {} }));

};
