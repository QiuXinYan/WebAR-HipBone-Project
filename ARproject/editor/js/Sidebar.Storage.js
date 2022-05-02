import * as THREE from 'three';
import { UIPanel, UIBreak, UIRow, UIColor, UISelect, UIText, UINumber, UIButton, UISpan, UIInput } from './libs/ui.js';
import { UIOutliner, UITexture } from './libs/ui.three.js';
import IndexDB from '../../assets/js/IndexDB.js';
import { SidebarScene } from './Sidebar.Scene.js';
import { SidebarProperties } from './Sidebar.Properties.js';
import { SidebarScript } from './Sidebar.Script.js';
import { SidebarAnimation } from './Sidebar.Animation.js';
import { SidebarProject } from './Sidebar.Project.js';
import { SidebarSettings } from './Sidebar.Settings.js';

function SidebarStorage(editor) {
	
	const config = editor.config;
	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UISpan();

	const settings = new UIPanel();
	settings.setBorderTop('0');
	settings.setPaddingTop('20px');
	container.add(settings);


	
	const dbName = 'customDB', storeName = 'matrixStorage'
	let db;
	; (async function () {
		db = await IndexDB.openDB(dbName, storeName, 1)
	})();
	
	function update() {
		; (async function () {
			let count = await IndexDB.getCounts(db, storeName);
			console.log(count);
		for(var i = 0; i < count; i++) {
			var data;
			data = await IndexDB.getDataByKey(db, storeName, i);
			var array= data.matrix;
			console.log(array)
			var position = new THREE.Vector3();
			var quaternion = new THREE.Quaternion()
			var scale = new THREE.Vector3();
			var matrix =  new THREE.Matrix4();

			matrix.fromArray(array.elements);
			console.log(matrix)
			matrix.decompose(position, quaternion, scale)

			const recordsShowRow = new UIRow();
			recordsShowRow.add(new UIText(i + ':').setWidth('30px'));
			//recordsShowRow.add(new UIText(data.Matrix).setWidth('100px'));
			settings.add(recordsShowRow);

			// const objectPositionRow = new UIRow();
			// const objectPositionX = new UIText(position.x.toFixed(2)).setWidth('50px');
			// const objectPositionY =  new UIText(position.y.toFixed(2)).setWidth('50px');
			// const objectPositionZ =  new UIText(position.z.toFixed(2)).setWidth('50px');
			// objectPositionRow.add(new UIText("位置信息").setWidth('90px'));
			// objectPositionRow.add(objectPositionX, objectPositionY, objectPositionZ);
			// settings.add(objectPositionRow);

			// //var rotation = 
			// var rotation = new THREE.Euler().setFromQuaternion( quaternion);
			// const objectRotationRow = new UIRow();
			// const objectRotationX = new UIText(rotation.x.toFixed(2)).setWidth('50px');
			// const objectRotationY = new UIText(rotation.y.toFixed(2)).setWidth('50px');
			// const objectRotationZ = new UIText(rotation.z.toFixed(2)).setWidth('50px');

			// objectRotationRow.add(new UIText("旋转信息").setWidth('90px'));
			// objectRotationRow.add(objectRotationX, objectRotationY, objectRotationZ);

			// settings.add(objectRotationRow);

			// // scale
			// const objectScaleRow = new UIRow();
			// const objectScaleX = new UIText(scale.x.toFixed(3)).setWidth('50px');
			// const objectScaleY = new UIText(scale.x.toFixed(3)).setWidth('50px');
			// const objectScaleZ = new UIText(scale.x.toFixed(3)).setWidth('50px');
			// objectScaleRow.add(new UIText("缩放信息").setWidth('90px'));
			// objectScaleRow.add(objectScaleX, objectScaleY, objectScaleZ);
			// settings.add(objectScaleRow);
		}
		})();
	}



	//button
	const clearStorageRow = new UIRow();
	const buttonClearStorage = new UIButton();
	buttonClearStorage.onClick(function () {
		; (async function () {
			var info = await IndexDB.removeDBAllRecords(db, storeName);
			console.log(info);
			editor.storeCounts = 0;
			editor.signals.storeinfoChange.dispatch();
		})();
	});

	clearStorageRow.add(new UIText(strings.getKey('sidebar/scene/deletaAllRecords')).setWidth('150px'));
	clearStorageRow.add(buttonClearStorage);
	settings.add(clearStorageRow);

	// Title
	const titleRow = new UIRow();
	let deletedID;
	const title = new UIInput(config.getKey()).setLeft('120px').setWidth('100px').onChange(function () {

		deletedID =  this.getValue();

	});

	// titleRow.add(new UIText("输入待删除的id").setWidth('120px'));
	// titleRow.add(title);
	// settings.add(titleRow);

	//
	// const UITextInfoShowRow = new UIRow();
	// UITextInfoShowRow.add(new UIText("当前存储信息如下：").setWidth('150px'));
	// settings.add(UITextInfoShowRow);

	editor.signals.storeinfoChange.add(update)
	
	
	

	return container;
}

export { SidebarStorage };
