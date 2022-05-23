import { CSS3DObject } from '../libs/three.js-r132/examples/jsm/renderers/CSS3DRenderer.js';
import { loadGLTF, loadTexture, loadTextures, loadVideo } from '../libs/loader.js';
const THREE = window.MINDAR.IMAGE.THREE;

document.addEventListener('DOMContentLoaded', () => {
  const start = async () => {

    // initialize MindAR 
    const mindarThree = new window.MINDAR.IMAGE.MindARThree({
      container: document.body,
      imageTargetSrc: './mindAR/assets/targets/card.mind',
    });
    const { renderer, cssRenderer, scene, cssScene, camera } = mindarThree;

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    const [
      cardTexture,
      boneTexture,
      locationTexture,
    ] = await loadTextures([
      './mindAR/assets/targets/card.png',
      './mindAR/assets/portfolio/icons/bone.png',
      './mindAR/assets/portfolio/icons/bone2.png'
    ]);

    const planeGeometry = new THREE.PlaneGeometry(1, 0.552);
    const cardMaterial = new THREE.MeshBasicMaterial({ map: cardTexture });
    const card = new THREE.Mesh(planeGeometry, cardMaterial);

    const iconGeometry = new THREE.CircleGeometry(0.075, 32);
    const emailMaterial = new THREE.MeshBasicMaterial({ map: boneTexture });
   
    const locationMaterial = new THREE.MeshBasicMaterial({ map: locationTexture });
  
    const emailIcon = new THREE.Mesh(iconGeometry, emailMaterial);

    const locationIcon = new THREE.Mesh(iconGeometry, locationMaterial);

    emailIcon.position.set(-0.14, -0.1, 0.2);
    locationIcon.position.set(-0.42, -0.1, 0.2);

    
    const avatar = await loadGLTF('./assets/models/compressed/KUANGU.gltf');
    avatar.scene.scale.set(0.002,0.002,0.002);
    
    const anchor = mindarThree.addAnchor(0);
    anchor.group.add(avatar.scene);
    anchor.group.add(card);
    anchor.group.add(emailIcon);
    anchor.group.add(locationIcon);

    const textElement = document.createElement("div");
    const textObj = new CSS3DObject(textElement);
    textObj.position.set(0, 500, 0);
    textObj.visible = false;
    textElement.style.background = "#FFFFFF";
    textElement.style.width = "400px";
    textElement.style.padding = "0px";
    textElement.style.fontSize = "60px";

    const cssAnchor = mindarThree.addCSSAnchor(0);
    cssAnchor.group.add(textObj);

    // handle buttons
    emailIcon.userData.clickable = true;
    locationIcon.userData.clickable = true;

    document.body.addEventListener('click', (e) => {
      const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      const mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      const mouse = new THREE.Vector2(mouseX, mouseY);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        let o = intersects[0].object;
        while (o.parent && !o.userData.clickable) {
          o = o.parent;
        }
        if (o.userData.clickable) {
          if (o === emailIcon) {
            textObj.visible = true;
            textElement.innerHTML = "髋骨包括髂骨、耻骨、坐骨。如果在凳子上坐着,这就是坐骨";
          } 
          else if (o === locationIcon) {
            textObj.visible = true;
            textElement.innerHTML = "骨盆是相当于保护腹部的所有脏器,包括肠、肝、胆、胰、脾等所有的空腔脏器";
          }
        }
      }
    });

    const clock = new THREE.Clock();
    await mindarThree.start();
    renderer.setAnimationLoop(() => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const iconScale = 1 + 0.2 * Math.sin(elapsed * 5);
      [ emailIcon, locationIcon].forEach((icon) => {
        icon.scale.set(iconScale, iconScale, iconScale);
      });
      avatar.scene.rotation.y += 0.01;
     const avatarZ = Math.min(0.3, -0.3 + elapsed * 0.5);
      avatar.scene.position.set(0, 2, avatarZ);
      renderer.render(scene, camera);
      cssRenderer.render(cssScene, camera);
    });
  }
  start();
});
