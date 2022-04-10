import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { OBJLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/OBJLoader.js';
import { GUI } from './jsm/libs/dat.gui.module.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';

let container, controller;
let camera, scene, renderer;
let mouseX = 0, mouseY = 0;
let windowHalfX, windowHalfY;
let material;
let propertyGUI;
let BRDFFragmentShader = {};
let startTime = new Date();
let currentFragShader;

init();
animate();

function init() {
    propertyGUI = new property();
    container = document.getElementById('container');
    document.body.appendChild(container);


    initShader();
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1500 );
    camera.position.z = 2;
    camera.position.x = 1;
    camera.lightDir = new THREE.Vector3(-1,-1,-1);
    camera.lightDir.normalize();
  
    scene = new THREE.Scene();

    var light = new THREE.PointLight( 0xffffff, 1, 100 );
    light.position.set( 10, 10, 10 );
    scene.add(light);


    var cubeMapTex = initCubeMap();
    material = new THREE.ShaderMaterial( {
      uniforms: {
        u_lightColor: { type: "v3", value: new THREE.Vector3(light.color.r, light.color.g, light.color.b)  },
        u_lightDir: { type: "v3", value: camera.lightDir },
        u_lightPos: { type: "v3", value: light.position},
        u_viewPos: {type: "v3", value: camera.position },
        u_diffuseColor: {type: "v3", value: new THREE.Vector3(0.9, 0.9, 0.9)},
        u_ambientColor: {type: "v3", value: new THREE.Vector3(0.1, 0.1, 0.1)},
        u_roughness: {type: "f", value: propertyGUI.roughness },
        u_fresnel: {type: "f", value: propertyGUI.fresnel },
        u_alpha: {type: "f", value: propertyGUI.roughness * propertyGUI.roughness },
        u_tCube: {type: "t", value: cubeMapTex },
        u_time: {type: "f", value: 0.0}
      },
      vertexShader: document.getElementById( 'vertexShader' ).textContent,
      fragmentShader: currentFragShader,
    } );
    
    let loader = new OBJLoader();
    loader.load( 'assets/models/KUANGU.obj',
      function( object ){
        object.traverse( function( child ) {
        if ( child instanceof THREE.Mesh ) {
          child.material = material;
        }
      } );
      object.position.set(0, 0, 0);
      //object.rotation.set(THREE.Math.degToRad(0),THREE.Math.degToRad(-180.0036),THREE.Math.degToRad(-359.5482));
      object.scale.set(0.02,0.02,0.02);
      scene.add(object);
    },
    function( xhr ){
      // console.log( (xhr.loaded / xhr.total * 100) + "% loaded")
    },
    function( err ){
      console.error( "Error loading 'box.obj'")
    }
);
    //add renderer
    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0xffffff, 1 );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );
    controller = new OrbitControls(camera, renderer.domElement);
    window.addEventListener( 'resize', onWindowResize, false );
  
  }
  
  //所有资源加载后调用
window.onload = function() {

  function roughnessCallback(value) {
    material.uniforms['u_roughness'].value = propertyGUI.roughness;
    material.uniforms['u_alpha'].value = propertyGUI.roughness * propertyGUI.roughness;
  }

  function fresnelCallback(value) {
    material.uniforms['u_fresnel'].value = propertyGUI.fresnel;
  }

  var datGui = new GUI();
  var roughnessController = datGui.add(propertyGUI, 'roughness', 0.01, 1.0);
  roughnessController.onChange(roughnessCallback);
  roughnessController.onFinishChange(roughnessCallback);

  var fresnelController = datGui.add(propertyGUI, 'fresnel', 1.0, 20.0);
  fresnelController.onChange(fresnelCallback);
  fresnelController.onFinishChange(fresnelCallback);

  var NDFController = datGui.add(propertyGUI, 'Normal_Dirstribution_Function', ['BlinnPhong', 'Beckmann', 'GGX']);
  NDFController.onFinishChange(function(value){

    currentFragShader = BRDFFragmentShader.init
    + BRDFFragmentShader.N[propertyGUI.Normal_Dirstribution_Function]
    + BRDFFragmentShader.G[propertyGUI.Geometric_Shadowing]
    + BRDFFragmentShader.main;

    material.fragmentShader = currentFragShader;
    material.needsUpdate = true;

  })

  var GController = datGui.add(propertyGUI, 'Geometric_Shadowing', ['Implicit', 'CookTorrance', 'Kelemen', 'Beckmann', 'Schlick_Beckmann']);
  GController.onFinishChange(function(value){
    currentFragShader = BRDFFragmentShader.init
    + BRDFFragmentShader.N[propertyGUI.Normal_Dirstribution_Function]
    + BRDFFragmentShader.G[propertyGUI.Geometric_Shadowing]
    + BRDFFragmentShader.main;

    material.fragmentShader = currentFragShader;
    material.needsUpdate = true;
  })

  var cubeMapController = datGui.add(propertyGUI, 'Cube_Map_Name', ['chapel', 'beach', 'church']);
  cubeMapController.onFinishChange(function(value) {
    var cubeMapTex = initCubeMap();
    material.uniforms.u_tCube.value = cubeMapTex;
  });
}


function initShader() {
  BRDFFragmentShader.init = document.getElementById( 'fragmentShader_param' ).textContent;

  BRDFFragmentShader.N = [];
  BRDFFragmentShader.N['BlinnPhong'] = document.getElementById( 'NDFBlinnPhong' ).textContent;
  BRDFFragmentShader.N['Beckmann'] = document.getElementById( 'NDFBeckmann' ).textContent;
  BRDFFragmentShader.N['GGX'] = document.getElementById( 'NDFGGX' ).textContent;

  BRDFFragmentShader.G = [];
  BRDFFragmentShader.G['Implicit'] = document.getElementById( 'GImplicit' ).textContent;
  BRDFFragmentShader.G['CookTorrance'] = document.getElementById( 'GCookTorrance' ).textContent;
  BRDFFragmentShader.G['Kelemen'] = document.getElementById( 'GKelemen' ).textContent;
  BRDFFragmentShader.G['Beckmann'] = document.getElementById( 'GBeckmann' ).textContent;
  BRDFFragmentShader.G['Schlick_Beckmann'] = document.getElementById( 'GSchlick_Beckmann' ).textContent;

  BRDFFragmentShader.main = document.getElementById( 'fragmentShader_main' ).textContent;

  currentFragShader = BRDFFragmentShader.init
  + BRDFFragmentShader.N['BlinnPhong']
  + BRDFFragmentShader.G['CookTorrance']
  + BRDFFragmentShader.main;
}


function initCubeMap() {

  // var urlPrefix = "./assets/cubemap/";
  // urlPrefix += propertyGUI.Cube_Map_Name + '/';

  // var urls = [ urlPrefix + "posx.jpg", urlPrefix + "negx.jpg",
  //   urlPrefix + "posy.jpg", urlPrefix + "negy.jpg",
  //   urlPrefix + "posz.jpg", urlPrefix + "negz.jpg" ];
  // var textureCube = {};
  // textureCube = THREE.ImageUtils.loadTextureCube( urls );
  // textureCube.format = THREE.RGBFormat;

  const cubeTextureloader = new THREE.CubeTextureLoader();
  cubeTextureloader.setPath( './assets/cubemap/' + propertyGUI.Cube_Map_Name + '/');

  const textureCube = cubeTextureloader.load( [
    'posx.jpg', 'negx.jpg',
    'posy.jpg', 'negy.jpg',
    'posz.jpg', 'negz.jpg'
  ] );

  // var shader = THREE.ShaderLib["cube"];
  // shader.uniforms['tCube'].value = textureCube;   // textureCube has been init before

  // var material = new THREE.ShaderMaterial({
  //   fragmentShader    : shader.fragmentShader,
  //   vertexShader  : shader.vertexShader,
  //   uniforms  : shader.uniforms,
  //   depthWrite: false,
	// 	side: THREE.BackSide
  // });
  var material = new THREE.MeshBasicMaterial( { color: 0xffffff, envMap: textureCube } );
  // build the skybox Mesh
  let skyboxMesh = new THREE.Mesh( new THREE.BoxGeometry( 200, 200, 200 ), material );
  // add it to the scene
  scene.add( skyboxMesh );

  return textureCube;
}


  function onWindowResize() {
  
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
  
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  
    renderer.setSize( window.innerWidth, window.innerHeight );
  
  }
  
  function property() {
    this.roughness = 0.21;
    this.fresnel = 10.0;
    this.Normal_Dirstribution_Function = 'BlinnPhong';
    this.Geometric_Shadowing = 'CookTorrance';
    this.Cube_Map_Name = 'chapel/';
  }

  function render() {
    renderer.render( scene, camera );
  }

  function animate() {
    requestAnimationFrame( animate );
    render();
    material.uniforms['u_time'].value = (new Date() - startTime) * 0.001;
  }