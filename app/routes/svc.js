const { Router } = require('express');

const controller = require('../controllers/svc');


const router = Router();



router.route('/full/:registration')
  .get(controller.getVdiFullCheck);

router.route('/summary/:registration')
  .get(controller.getVdiSummary);

router.route('/:datapackage/:registration')
  .get(controller.getDataByPackage);

router.route('/fail')
  .get(controller.getDataFail);


module.exports = router;
