const request         = require('request-promise');

const debug           = require('debug')('app:svcController');
const { blue, green } = require('chalk');

const Report          = require('../models/reportModel');

const { dataPackages } = require('../data');


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
 * GET /:datapackage/:registration
 * Get data by package param and VRM.
 */
exports.getDataByPackage = (req, res, next) => {
  req.params.datapackage = req.params.datapackage.toLowerCase();

  req.assert('datapackage', 'Data Package is not valid').isIn(dataPackages);
  req.assert('registration', 'Registration is not valid').isAlphanumeric();

  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json({ msg: errors[0].msg });
  }

  requestOptions.qs.key_VRM(req.params.registration);
  requestOptions.uri = `${process.env.UKVD_API_URL_datapackage}/${req.params.datapackage}`;

  request(requestOptions)
    .then((result) => {
      const {
        StatusMessage,
        StatusCode,
        DataItems
      } = result.body.Response;

      debug(`${blue('UKVD:')} ${req.params.datapackage} ${StatusMessage}`);
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


/**
 * VdiFullCheck by VRM
 * return report
 */
exports.generateReport = (reportType, registration) => {
  let data = {},
   requestData,
   requestIMGData;

  if(reportType === 'Full') {
    requestData = requestOptions(process.env.UKVD_API_URL_VdiCheckFull, registration);
  }

 requestIMGData = requestOptions(process.env.UKVD_API_URL_VehicleImageData, registration);

  return request(requestData)
    .then((result) => {
      let {
        StatusMessage,
        StatusCode,
        DataItems
      } = result.body.Response;

      data = DataItems;

      // debug(`${blue('requestOptions:')} ${JSON.stringify(requestOptions)}`);
      // debug(`${blue('UKVD:')} ${StatusMessage}`);
      if (StatusCode !== 'Success') throw new Error(StatusCode);

     return request(requestIMGData);

      // debug(`${green('Report:')} ${JSON.stringify(report)}`);
    })
   .then((result) => {
    const {
     StatusMessage,
     StatusCode,
     DataItems
    } = result.body.Response;

    debug(`${blue('UKVD:')} ${StatusMessage}`);
    if (StatusCode !== 'Success') throw new Error(StatusCode);

    return  DataItems;
   })
    .then(result => {
      let img = result.VehicleImages.ImageDetailsList[0].ImageUrl;

      return new Report({
        reportType,
        registration,
        img: img,
        data: data,
       });
    })
    .catch(err => err);
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
