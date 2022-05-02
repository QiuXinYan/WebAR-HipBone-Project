import * as THREE from 'three';

import { Config } from './Config.js';
import { Loader } from './Loader.js';
import { History as _History } from './History.js';
import { Strings } from './Strings.js';
import { Storage as _Storage } from './Storage.js';
import { AddObjectCommand } from './commands/AddObjectCommand.js';
import { OBJLoader } from '../../three/jsm/loaders/OBJLoader.js';

//整个编辑器的相机DEFAULT_CAMERA
var _DEFAULT_CAMERA = new THREE.PerspectiveCamera(50, 1, 0.01, 1000);
_DEFAULT_CAMERA.name = 'Camera';
_DEFAULT_CAMERA.position.set(0, 50, 100);
_DEFAULT_CAMERA.lookAt(new THREE.Vector3());

//编辑器的上下文,是所有ui与对象交互的桥梁

function Editor() {

	var Signal = signals.Signal;

	//信息传递的介质this.signals
	this.signals = {

		// script

		editScript: new Signal(),

		// player

		startPlayer: new Signal(),
		stopPlayer: new Signal(),

		// vr

		toggleVR: new Signal(),
		exitedVR: new Signal(),

		// notifications

		editorCleared: new Signal(),

		savingStarted: new Signal(),
		savingFinished: new Signal(),

		transformModeChanged: new Signal(),
		snapChanged: new Signal(),
		spaceChanged: new Signal(),
		rendererCreated: new Signal(),
		rendererUpdated: new Signal(),

		sceneBackgroundChanged: new Signal(),
		sceneEnvironmentChanged: new Signal(),
		sceneFogChanged: new Signal(),
		sceneFogSettingsChanged: new Signal(),
		sceneGraphChanged: new Signal(),
		sceneRendered: new Signal(),

		cameraChanged: new Signal(),
		cameraResetted: new Signal(),

		geometryChanged: new Signal(),

		objectSelected: new Signal(),
		objectFocused: new Signal(),

		objectAdded: new Signal(),
		objectChanged: new Signal(),
		objectRemoved: new Signal(),

		cameraAdded: new Signal(),
		cameraRemoved: new Signal(),

		helperAdded: new Signal(),
		helperRemoved: new Signal(),

		materialAdded: new Signal(),
		materialChanged: new Signal(),
		materialRemoved: new Signal(),

		scriptAdded: new Signal(),
		scriptChanged: new Signal(),
		scriptRemoved: new Signal(),

		windowResize: new Signal(),

		showGridChanged: new Signal(),
		showHelpersChanged: new Signal(),
		refreshSidebarObject3D: new Signal(),
		historyChanged: new Signal(),

		viewportCameraChanged: new Signal(),
		animationStopped: new Signal(),

		storeinfoChange : new Signal(),


	};

	this.config = new Config();
	this.history = new _History(this);

	this.storage = new _Storage();

	this.strings = new Strings(this.config);
	this.defaultlight = new THREE.DirectionalLight( 0xffffff, 0.5 );
	this.loader = new Loader(this);

	this.camera = _DEFAULT_CAMERA.clone();

	this.scene = new THREE.Scene();
	this.scene.name = 'Scene';

	this.sceneHelpers = new THREE.Scene();

	this.object = {};
	this.geometries = {};
	this.materials = {};
	this.textures = {};
	this.scripts = {};

	this.materialsRefCounter = new Map(); // tracks how often is a material used by a 3D object

	this.mixer = new THREE.AnimationMixer(this.scene);
	//当前关注的对象this.selected
	this.selected = null;
	//配准对应的原始物体
	this.selectedByName = null;

	this.helpers = {};

	this.cameras = {};
	this.viewportCamera = this.camera;
	this.addCamera(this.camera);

	//目前存储信息物体的数量
	this.storeCounts = 0;
}

Editor.prototype = {

	setScene: function (scene) {

		this.scene.uuid = scene.uuid;
		this.scene.name = scene.name;

		this.scene.background = scene.background;
		this.scene.environment = scene.environment;
		this.scene.fog = scene.fog;

		this.scene.userData = JSON.parse(JSON.stringify(scene.userData));

		// avoid render per object

		this.signals.sceneGraphChanged.active = false;

		while (scene.children.length > 0) {

			this.addObject(scene.children[0]);

		}

		this.signals.sceneGraphChanged.active = true;
		this.signals.sceneGraphChanged.dispatch();

	},

	//

	addObject: function (object, parent, index) {

		var scope = this;

		object.traverse(function (child) {

			if (child.geometry !== undefined) scope.addGeometry(child.geometry);
			if (child.material !== undefined) scope.addMaterial(child.material);

			scope.addCamera(child);
			scope.addHelper(child);

		});

		if (parent === undefined) {

			this.scene.add(object);

		} else {

			parent.children.splice(index, 0, object);
			object.parent = parent;

		}
		
		this.signals.objectAdded.dispatch(object);
		this.signals.sceneGraphChanged.dispatch();

	},

	moveObject: function (object, parent, before) {

		if (parent === undefined) {

			parent = this.scene;

		}

		parent.add(object);

		// sort children array

		if (before !== undefined) {

			var index = parent.children.indexOf(before);
			parent.children.splice(index, 0, object);
			parent.children.pop();

		}

		this.signals.sceneGraphChanged.dispatch();

	},

	nameObject: function (object, name) {

		object.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	removeObject: function (object) {

		if (object.parent === null) return; // avoid deleting the camera or scene

		var scope = this;

		object.traverse(function (child) {

			scope.removeCamera(child);
			scope.removeHelper(child);

			if (child.material !== undefined) scope.removeMaterial(child.material);

		});

		object.parent.remove(object);

		this.signals.objectRemoved.dispatch(object);
		this.signals.sceneGraphChanged.dispatch();

	},

	addGeometry: function (geometry) {

		this.geometries[geometry.uuid] = geometry;

	},

	setGeometryName: function (geometry, name) {

		geometry.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	addMaterial: function (material) {

		if (Array.isArray(material)) {

			for (var i = 0, l = material.length; i < l; i++) {

				this.addMaterialToRefCounter(material[i]);

			}

		} else {

			this.addMaterialToRefCounter(material);

		}

		this.signals.materialAdded.dispatch();

	},

	addMaterialToRefCounter: function (material) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get(material);

		if (count === undefined) {

			materialsRefCounter.set(material, 1);
			this.materials[material.uuid] = material;

		} else {

			count++;
			materialsRefCounter.set(material, count);

		}

	},

	removeMaterial: function (material) {

		if (Array.isArray(material)) {

			for (var i = 0, l = material.length; i < l; i++) {

				this.removeMaterialFromRefCounter(material[i]);

			}

		} else {

			this.removeMaterialFromRefCounter(material);

		}

		this.signals.materialRemoved.dispatch();

	},

	removeMaterialFromRefCounter: function (material) {

		var materialsRefCounter = this.materialsRefCounter;

		var count = materialsRefCounter.get(material);
		count--;

		if (count === 0) {

			materialsRefCounter.delete(material);
			delete this.materials[material.uuid];

		} else {

			materialsRefCounter.set(material, count);

		}

	},

	getMaterialById: function (id) {

		var material;
		var materials = Object.values(this.materials);

		for (var i = 0; i < materials.length; i++) {

			if (materials[i].id === id) {

				material = materials[i];
				break;

			}

		}

		return material;

	},

	setMaterialName: function (material, name) {

		material.name = name;
		this.signals.sceneGraphChanged.dispatch();

	},

	addTexture: function (texture) {

		this.textures[texture.uuid] = texture;

	},

	//

	addCamera: function (camera) {

		if (camera.isCamera) {

			this.cameras[camera.uuid] = camera;

			this.signals.cameraAdded.dispatch(camera);

		}

	},

	removeCamera: function (camera) {

		if (this.cameras[camera.uuid] !== undefined) {

			delete this.cameras[camera.uuid];

			this.signals.cameraRemoved.dispatch(camera);

		}

	},

	//

	addHelper: function () {

		var geometry = new THREE.SphereGeometry(2, 4, 2);
		var material = new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false });

		return function (object, helper) {

			if (helper === undefined) {

				if (object.isCamera) {

					helper = new THREE.CameraHelper(object);

				} else if (object.isPointLight) {

					helper = new THREE.PointLightHelper(object, 1);

				} else if (object.isDirectionalLight) {

					helper = new THREE.DirectionalLightHelper(object, 1);

				} else if (object.isSpotLight) {

					helper = new THREE.SpotLightHelper(object);

				} else if (object.isHemisphereLight) {

					helper = new THREE.HemisphereLightHelper(object, 1);

				} else if (object.isSkinnedMesh) {

					helper = new THREE.SkeletonHelper(object.skeleton.bones[0]);

				} else if (object.isBone === true && object.parent?.isBone !== true) {

					helper = new THREE.SkeletonHelper(object);

				} else {

					// no helper for this object type
					return;

				}

				const picker = new THREE.Mesh(geometry, material);
				picker.name = 'picker';
				picker.userData.object = object;
				helper.add(picker);

			}

			this.sceneHelpers.add(helper);
			this.helpers[object.id] = helper;

			this.signals.helperAdded.dispatch(helper);

		};

	}(),

	removeHelper: function (object) {

		if (this.helpers[object.id] !== undefined) {

			var helper = this.helpers[object.id];
			helper.parent.remove(helper);

			delete this.helpers[object.id];

			this.signals.helperRemoved.dispatch(helper);

		}

	},

	//

	addScript: function (object, script) {

		if (this.scripts[object.uuid] === undefined) {

			this.scripts[object.uuid] = [];

		}

		this.scripts[object.uuid].push(script);

		this.signals.scriptAdded.dispatch(script);

	},

	removeScript: function (object, script) {

		if (this.scripts[object.uuid] === undefined) return;

		var index = this.scripts[object.uuid].indexOf(script);

		if (index !== - 1) {

			this.scripts[object.uuid].splice(index, 1);

		}

		this.signals.scriptRemoved.dispatch(script);
	},

	getObjectMaterial: function (object, slot) {

		var material = object.material;

		if (Array.isArray(material) && slot !== undefined) {

			material = material[slot];

		}

		return material;

	},

	setObjectMaterial: function (object, slot, newMaterial) {

		if (Array.isArray(object.material) && slot !== undefined) {

			object.material[slot] = newMaterial;

		} else {

			object.material = newMaterial;

		}

	},

	setViewportCamera: function (uuid) {

		this.viewportCamera = this.cameras[uuid];
		this.camera = this.cameras[uuid];
		this.signals.viewportCameraChanged.dispatch();

	},

	//

	select: function (object) {

		if (this.selected === object) return;

		var uuid = null;

		if (object !== null) {

			uuid = object.uuid;

		}

		this.selected = object;

		this.config.setKey('selected', uuid);
		this.signals.objectSelected.dispatch(object);

	},

	selectById: function (id) {

		if (id === this.camera.id) {

			this.select(this.camera);
			return;

		}

		this.select(this.scene.getObjectById(id));

	},

	selectByName: function (name) {

		var scope = this;

		this.scene.traverse(function (child) {

			if (child.name === name) {
				scope.selectedByName = child;
				console.log(child);
				return;
			}
		});
	},

	selectByUuid: function (uuid) {

		var scope = this;

		this.scene.traverse(function (child) {

			if (child.uuid === uuid) {

				scope.select(child);

			}

		});

	},

	deselect: function () {

		this.select(null);

	},

	focus: function (object) {

		if (object !== undefined) {

			this.signals.objectFocused.dispatch(object);

		}

	},

	focusById: function (id) {

		this.focus(this.scene.getObjectById(id));

	},

	clear: function () {

		this.history.clear();
		this.storage.clear();
		this.storeCounts = 0;
		this.camera.copy(_DEFAULT_CAMERA);
		this.signals.cameraResetted.dispatch();

		this.scene.name = 'Scene';
		this.scene.userData = {};
		this.scene.background = null;
		this.scene.environment = null;
		this.scene.fog = null;

		var objects = this.scene.children;

		while (objects.length > 0) {

			this.removeObject(objects[0]);

		}

		this.geometries = {};
		this.materials = {};
		this.textures = {};
		this.scripts = {};

		this.materialsRefCounter.clear();

		this.animations = {};
		this.mixer.stopAllAction();

		this.deselect();

		this.signals.editorCleared.dispatch();

	},

	//

	fromJSON: async function (json) {

		var loader = new THREE.ObjectLoader();
		var camera = await loader.parseAsync(json.camera);

		this.camera.copy(camera);
		this.signals.cameraResetted.dispatch();

		this.history.fromJSON(json.history);
		this.scripts = json.scripts;

		this.setScene(await loader.parseAsync(json.scene));

	},

	toJSON: function () {

		// scripts clean up

		var scene = this.scene;
		var scripts = this.scripts;

		for (var key in scripts) {

			var script = scripts[key];

			if (script.length === 0 || scene.getObjectByProperty('uuid', key) === undefined) {

				delete scripts[key];
			}

		}

		//

		return {

			metadata: {},
			project: {
				shadows: this.config.getKey('project/renderer/shadows'),
				shadowType: this.config.getKey('project/renderer/shadowType'),
				vr: this.config.getKey('project/vr'),
				physicallyCorrectLights: this.config.getKey('project/renderer/physicallyCorrectLights'),
				toneMapping: this.config.getKey('project/renderer/toneMapping'),
				toneMappingExposure: this.config.getKey('project/renderer/toneMappingExposure')
			},
			camera: this.camera.toJSON(),
			scene: this.scene.toJSON(),
			scripts: this.scripts,
			history: this.history.toJSON()

		};

	},

	objectByUuid: function (uuid) {

		return this.scene.getObjectByProperty('uuid', uuid, true);

	},

	execute: function (cmd, optionalName) {

		this.history.execute(cmd, optionalName);

	},

	undo: function () {

		this.history.undo();

	},

	executeObjects: function () {


	},

	redo: function () {

		this.history.redo();

	},

	importRegitrationModel: function() {
		const loader = new OBJLoader();
		var scope = this;
		// load a resource
		loader.load(
			// resource URL
			'../../assets/models/box.obj',
			// called when resource is loaded
			function (object) {
				scope.selectedByName = object;
			},
			// called when loading is in progresses
			function (xhr) {
				console.log((xhr.loaded / xhr.total * 100) + '% loaded');

			},
			// called when loading has errors
			function (error) {

				console.log('An error happened',error);
			}
		);/*  */
	}

};

export { Editor };
