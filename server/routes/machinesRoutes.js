const express = require('express');
const router = express.Router();
const machinesController = require('../controllers/machinesController');
const permission = require('../permissions/permissionMiddleware');

router.get('/', permission('viewMachines'), machinesController.getMachines);
router.post('/', permission('createMachine'), machinesController.createMachine);
router.put('/:id', permission('updateMachine'), machinesController.updateMachine);
router.delete('/:id', permission('deleteMachine'), machinesController.deleteMachine);

router.get('/types', permission('getMachineTypes'), machinesController.getMachineTypes);
router.post('/types', permission('addMachineType'), machinesController.addMachineType);
router.post('/types/ensure-defaults', permission('ensureDefaultTypes'), machinesController.ensureDefaultTypes);
router.post('/types/repopulate-defaults', permission('repopulateDefaultTypes'), machinesController.repopulateDefaultTypes);
router.get('/count', machinesController.getMachineCount);

module.exports = router;
