
  let container, controller;
  let camera, scene, renderer;
  let model,skinmodel;
  let windowHalfX, windowHalfY;
  let panel;
  let modelPBRmaterial, skinMaterial;
  init();
  animate();

  function init() {
    container = document.getElementById('container');
    document.body.appendChild(container);

    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 10000);
    camera.position.set(-5, 0, 1);       //设置相机的位置
    camera.lookAt(1, -1, -1);			      //相机看的方向
    scene.add(camera);

    //------------------------add lights---------------------------------------//
    const Ambientlight = new THREE.AmbientLight( 0x404040 ); // soft white light
    scene.add( Ambientlight );

    const pointlight = new THREE.PointLight( 0xffffff, 1, 5 );
    pointlight.intensity = 0.5;
    pointlight.position.set( 0, -2, 0 );
    scene.add( pointlight );

    // White directional light at one intensity shining from the top.
    const directionalLight = new THREE.DirectionalLight(0xdfebff, 1.75);

    directionalLight.position.set(2, 8, 4);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.far = 20;
    scene.add(directionalLight);

    scene.add(new THREE.CameraHelper(directionalLight.shadow.camera));
  //------------------------  end ---------------------------------------//

    //------------------------load models---------------------------------------//

    //let modelmaterial = new THREE.MeshPhongMaterial({ color: 0x404040, specular: 0x111111 });
    modelPBRmaterial = new THREE.ShaderMaterial( {
      uniforms: {
        albedo: { type: "v3", value: new THREE.Vector3( 0.3, 0.3, 0.3)},
        lightPosition: { type: "v3", value: new THREE.Vector3( -10.0,  10.0, 10.0)},
        lightColor: { type: "v3", value: new THREE.Vector3( 300.0, 300.0, 300.0)},
        ao: { type: "f", value: 1.0 },
        metallic: { type: "f", value: 0 },
        roughness: {type: "f", value: 0.9},
      },
      vertexShader: document.getElementById( 'vertexShader' ).textContent,
      fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
    } );

    
    skinMaterial = new THREE.MeshPhongMaterial({
      opacity: 1.0,
      transparent: true,
    });
    let loader = new THREE.GLTFLoader();
    let path = './assets/models/compressed/SKIN.gltf';
    var dracoloader = new THREE.DRACOLoader();
    dracoloader.setDecoderPath('./three/draco/gltf/');
    loader.setDRACOLoader(dracoloader);
    loader.load(
      path,
      (gltf) => {
        model = gltf.scene;
        model.traverse(function (gltf) {
          if (gltf.isMesh) {   
            gltf.castShadow = true;
            gltf.geometry.computeVertexNormals();
            gltf.material = skinMaterial; 
            skinmodel = gltf;      
          }
        });
        model.position.set(-2, 0.5, 4);
        model.scale.set(0.003, 0.003, 0.003);
        model.rotation.x += Math.PI/2;
        model.rotation.y += Math.PI/2;
        scene.add(model);
      },
      (xhr) => {
      },
      (error) => {
        console.log('An error happened', error);
      }
    );

    //load objects function
    loader = new THREE.GLTFLoader();
    path = './assets/models/compressed/KUANGU.gltf';
    dracoloader = new THREE.DRACOLoader();
    dracoloader.setDecoderPath('./three/draco/gltf/');
    loader.setDRACOLoader(dracoloader);
    loader.load(
      path,
      (gltf) => {
        model = gltf.scene;
        model.traverse(function (gltf) {
          if (gltf.isMesh) {   
            gltf.castShadow = true;
            gltf.geometry.computeVertexNormals();
            gltf.material = modelPBRmaterial;
          }
        });
        model.position.set(-2, 0.5, 4);
        model.scale.set(0.003, 0.003, 0.003);
        model.rotation.x += Math.PI/2;
        model.rotation.y += Math.PI/2;
        scene.add(model);
      },
      (xhr) => {
      },
      (error) => {
        console.log('An error happened', error);
      }
    );




    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x404040, specular: 0x111111 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000, 8, 8), groundMaterial);
    ground.rotation.x = - Math.PI / 2;
    ground.position.y = -3;
    ground.receiveShadow = true;
    scene.add(ground);
    
    //renderer 
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(devicePixelRatio);
    
    //renderer.domElement.style.position = 'relative'
    // renderer.domElement.style.top = '0px'
    // renderer.domElement.style.left = '0px'
    container.appendChild(renderer.domElement); //show in chorme
    renderer.shadowMap.enabled = true;
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minDistance = 0;
    controls.maxDistance = 10;
    controls.target.set(0, 0, - 0.2);
    controls.update();
    

    //add panels
    addPanel();
    window.addEventListener('resize', onWindowResize);

  }
  function animate() {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

  }

  //add panels
  function addPanel() {
    panel = new dat.GUI({ width: 200 });
    //Set the position of the panel
    panel.domElement.style.position = 'absolute';
    panel.domElement.style.right = '0px';
    panel.domElement.style.top = '100px';

    const parameters = {
      ao: modelPBRmaterial.uniforms.ao.value,
      metallic: modelPBRmaterial.uniforms.metallic.value,   
      roughness: modelPBRmaterial.uniforms.roughness.value,
    }

    const materials = {
      visibility: true,
      opacity: 1.0 
    }

    function roughnessCallback() {
      modelPBRmaterial.uniforms.roughness.value = parameters.roughness;
    }
  
    function aoCallback() {
      modelPBRmaterial.uniforms.ao.value = parameters.ao;
    }

    function metallicCallback() {
      modelPBRmaterial.uniforms.metallic.value = parameters.metallic;
    }

    function modifyvisibility() {
      skinmodel.visible = materials.visibility;  
    }

    function modifyTransparency() {
      skinmodel.material.opacity = materials.opacity;  
    }

    const parametersfolder = panel.addFolder('PBR参数');

    parametersfolder.add(parameters, 'roughness', 0.0, 1.0).onChange(roughnessCallback);
    parametersfolder.add(parameters, 'metallic', 0.0, 1.0).onChange(metallicCallback);
    parametersfolder.add(parameters, 'ao', 0.0, 1.0).onChange(aoCallback);

    const visibilityfolder = panel.addFolder('皮肤可见度');
    visibilityfolder.add(materials, 'visibility').onChange(modifyvisibility);

    visibilityfolder.add(materials, 'opacity', 0.0, 1.0).onChange(modifyTransparency);
}