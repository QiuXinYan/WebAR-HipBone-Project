import {GLTFLoader} from "./three.js-r132/examples/jsm/loaders/GLTFLoader.js";
import {STLLoader} from "./three.js-r132/examples/jsm/loaders/STLLoader.js";

import * as THREE from "./three.js-r132/build/three.module.js";

//const THREE = window.MINDAR.IMAGE? window.MINDAR.IMAGE.THREE: window.MINDAR.FACE.THREE;

export const loadGLTF = (path) => {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(path, (gltf) => {
      resolve(gltf);
    });
  });
}

// const loader = new STLLoader();
// loader.load( './models/stl/ascii/slotted_disk.stl', function ( geometry ) {

//   const material = new THREE.MeshPhongMaterial( { color: 0xff5533, specular: 0x111111, shininess: 200 } );
//   const mesh = new THREE.Mesh( geometry, material );

//   mesh.position.set( 0, - 0.25, 0.6 );
//   mesh.rotation.set( 0, - Math.PI / 2, 0 );
//   mesh.scale.set( 0.5, 0.5, 0.5 );

//   mesh.castShadow = true;
//   mesh.receiveShadow = true;

//   scene.add( mesh );

// } );

// export const STLLoader = (path) => {
//   return new Promise((resolve, reject) => {
//     const loader = new GLTFLoader();
//     loader.load(path, (gltf) => {
//       resolve(gltf);
//     });
//   });
// }


export const loadAudio = (path) => {
  return new Promise((resolve, reject) => {
    const material = new THREE.MeshPhongMaterial( { color: 0xff5533, specular: 0x111111, shininess: 200 } );
    const loader = new THREE.AudioLoader();
    loader.load(path, (buffer) => {
      resolve(buffer);
    });
  });
}

export const loadVideo = (path) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.addEventListener('loadeddata', () => {
      video.setAttribute('playsinline', '');
      resolve(video);
    });
    video.src = path;
  });
}

export const loadTexture = (path) => {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(path, (texture) => {
      resolve(texture);
    }); 
  });
}

export const loadTextures = (paths) => {
  const loader = new THREE.TextureLoader();
  const promises = [];
  for (let i = 0; i < paths.length; i++) {
    promises.push(new Promise((resolve, reject) => {
      loader.load(paths[i], (texture) => {
	resolve(texture);
      }); 
    }));
  }
  return Promise.all(promises);
}
