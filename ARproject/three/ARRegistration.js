import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { OBJLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/OBJLoader.js';
import { GUI } from './jsm/libs/dat.gui.module.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/TransformControls.js';


let width, height;
width = window.innerWidth;
height = window.innerHeight;

//const element = html`<div style="position: absolute;  top: 0; left: 0; background: blue; width: ${width}; height: ${height}px">
//</div>`;
//const leftElement = html`<div id="left" style="position: absolute; top: 0; left: 0; width: ${width/2}px; height: ${height/2}px; opacity: 0;"></div>`;
//const rightElement = html`<div id="right" style="position: absolute; top: 0; left: ${width/2}px; width: ${width/2}px; height: ${height/2}px; opacity: 0;"></div>`;
//const leftdownElement =  html`<div id="leftdown" style="position: absolute; left: 0; top: ${height/2};  width: ${width/2}px; height: ${height/2}px; opacity: 0;"></div>`;
//const rightdownElement =  html`<div id="rightdown" style="position: absolute; top: ${height/2}; left: ${width/2}px; width: ${width/2}px; height: ${height/2}px; opacity: 0;"></div>`;

//add variables
let leftElement, rightElement, leftdownElement, rightdownElement;
let scene, renderer;
let panel;
let windowWidth, windowHeight;
const pointer = new THREE.Vector2();
let object_test;
let controls;
let cameraTop, cameraFront;

init();
animate();
//https://observablehq.com/@vicapow/three-js-transformcontrols-example
//https://observablehq.com/@vicapow/threejs-example-of-multiple-transform-controls


function init() {
	controls = undefined;
	leftElement =  document.getElementById('left');
	rightElement =  document.getElementById('right');
	leftdownElement =  document.getElementById('leftdown');
	rightdownElement =  document.getElementById('rightdown');
	const container = document.getElementById('container');

	scene = new THREE.Scene();

	const light = new THREE.DirectionalLight(0xffffff);
	light.position.set(0, 0, 1);
	scene.add(light);


	const canvas = document.createElement('canvas');
	canvas.width = 128;
	canvas.height = 128;

	const context = canvas.getContext('2d');
	const gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
	gradient.addColorStop(0.1, 'rgba(0,0,0,0.15)');
	gradient.addColorStop(1, 'rgba(0,0,0,0)');

	context.fillStyle = gradient;
	context.fillRect(0, 0, canvas.width, canvas.height);

	renderer = new THREE.WebGLRenderer();

	const createCamera = () => {
		const fov = 45;
		const aspect = width / height;
		const near = 1;
		const far = 100000;
		const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		return camera;
	};
	
	cameraTop = createCamera();
	cameraTop.name = 'Camera Top';
	cameraTop.position.z = -0.1;
	cameraTop.position.y = 1500;
	cameraTop.lookAt(new THREE.Vector3(0, 0, 0));
	
	cameraFront = createCamera();
	cameraFront.name = 'Camera Front';
	cameraFront.position.x = 800;
	cameraFront.lookAt(new THREE.Vector3(0, 0, 0));

	//add grid helper
	const size = 10000;
	const divisions = 100;
	const gridHelper = new THREE.GridHelper(size, divisions, 0x0000ff, 0x808080);
	scene.add(gridHelper);

	//orginal obj - 
	//set parameters
	let material = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
	var position = new THREE.Vector3(0, 0, -2);
	var rotation = new THREE.Vector3(0, 0, 0);
	var scale = new THREE.Vector3(1, 1, 1);
	loadObjects('./ar/models/box.obj',material, position, rotation, scale);
	

	let material1 = new THREE.MeshPhongMaterial({color: 0xffff00,transparent:true, opacity: 1.0});
    let loader1 = new OBJLoader();
        loader1.load( 'ar/models/box.obj',
          function( object ){
            object.traverse( function( child ) {
            if ( child instanceof THREE.Mesh ) {
              child.material = material1;
            }
          } );
          object.position.set(-1.461, -0.6300001, 1.152);
          object.rotation.set(THREE.Math.degToRad(0.1947449),THREE.Math.degToRad(-180.0036),THREE.Math.degToRad(-359.5482));
          object.scale.set(1,1,1);
		  object_test = object;
		  scene.add(object);
        },
        function( xhr ){
          // console.log( (xhr.loaded / xhr.total * 100) + "% loaded")
        },
        function( err ){
          console.error( "Error loading 'box.obj'")
        }
      );

	InitGui();
	setControlsForCamera(cameraTop, leftElement);	
	// initialize the renderer
	
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	container.appendChild(renderer.domElement);

	//add event listeners
	document.addEventListener('mousemove', onPointerMove);

	leftElement.addEventListener('mousemove', () => setControlsForCamera(cameraTop, leftElement));
	rightElement.addEventListener('mousemove', () => setControlsForCamera(cameraFront, rightElement));
}

function setControlsForCamera(camera, element) {
    // Do we really need to update the camera?
    if (controls && controls.domElement === element && controls.camera === camera) {
      return;
    }
    // the TransformControls API requires us to remove and recreate the entire TransformControls
    // object instead of just updating the `domElement` and `camera` properties.
    if (controls) {
      controls.removeEventListener('objectChange', render);
      scene.remove(controls);
      // Removes all the dom element event listeners.
      controls.dispose();
      controls = undefined;
    }
    controls = new TransformControls(camera, element);
    // see: https://github.com/mrdoob/three.js/pull/18231
    controls.domElement = element;
    controls.addEventListener('objectChange', render);
    controls.attach(object_test);
    scene.add(controls);
	render();
 };

function onPointerMove(event) {

	pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
	pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

}

function updateSize() {

	if (windowWidth != window.innerWidth || windowHeight != window.innerHeight) {
		windowWidth = window.innerWidth;
		windowHeight = window.innerHeight;
		renderer.setSize(windowWidth, windowHeight);
	}

}

// function animate() {

// 	//render();

// 	requestAnimationFrame(animate);

// }

function render() {
	let left = 0;
    const bottom = 0;

    renderer.setViewport(left, Math.floor(height / 2), Math.floor(width / 2), Math.floor(height / 2));
    renderer.setScissor(left , Math.floor(height / 2), Math.floor(width / 2), Math.floor(height / 2));
    renderer.setScissorTest(true);
    renderer.setClearColor(new THREE.Color(1, 1, 1));
    cameraTop.aspect = Math.floor(width / 2) / height;
    cameraTop.updateProjectionMatrix();
    renderer.render(scene, cameraTop);

    left = Math.floor(width / 2);
    renderer.setViewport(left, Math.floor(height / 2), Math.floor(width / 2), Math.floor(height / 2));
    renderer.setScissor(left, Math.floor(height / 2), Math.floor(width / 2), Math.floor(height / 2));
    renderer.setScissorTest(true);
    renderer.setClearColor(new THREE.Color(1, 1, 1));
    cameraFront.aspect = Math.floor(width / 2) / height;
    cameraFront.updateProjectionMatrix();
    renderer.render(scene, cameraFront);
}

//-------------------------------- GUI Controls --------------------------------------------------//

function InitGui() {
	panel = new GUI({ width: 615 });
	panel.domElement.style.position = 'absolute';
	panel.domElement.style.marginRight = '0px'
	panel.domElement.style.right = '0px';
	panel.domElement.style.top = '300px';
	const folder1 = panel.addFolder('Size');
	
	const settings = {

	}
	//Open the folder
	folder1.open();
	//add folder content into the folder
	// folder1.add(settings.plane, 'width', 1, 50).onChange(modifySize);
	// folder1.add(settings.plane, 'height', 1, 50).onChange(modifySize);
	// folder1.add(settings.plane, 'widthSegments', 1, 100).onChange(modifySize);
	// folder1.add(settings.plane, 'heightSegments', 1, 100).onChange(modifySize);
}

function modifySize() {

}

// ------------------------------ load objects ----------------------------------------------------//

function loadObjects(loadPath, material, position, rotation, scale) {
	let loader = new OBJLoader();
	loader.load(loadPath, function (object) {
		object.traverse(function (child) {
			if (child instanceof THREE.Mesh) {
				child.material = material;
			}
		});
		object.position.set(position);
		object.rotation.set(rotation);
		object.scale.set(scale);
		scene.add(object);
	},
		function (xhr) {
			// console.log( (xhr.loaded / xhr.total * 100) + "% loaded")
		},
		function (err) {
			console.error("Error loading" + loadPath)
		}
	);
}

//-----------------------------------------------------------------------------------------------------