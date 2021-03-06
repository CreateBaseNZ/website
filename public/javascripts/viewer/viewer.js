/* ========================================================================================
VARIABLES
======================================================================================== */

let viewer = {
  upload: undefined,
  fetch: undefined,
  process: undefined
}

viewer.fetch = async (model, elementID) => {
  /* Now we can actually start writing JavaScript. We’ll be defining a simple
  function to act as the STL viewer, given the path to the STL file, and the
  ID of the element that it takes. */
  var elem = document.getElementById(elementID);

  /* Then, we create the camera using three.js. We use information about the
  element’s size to determine the aspect ratio, and we use arguments 1 and
  1000 to indicate that the camera should clip things closer than 1 unit away
  and further than 1000 units away. */
  var camera = new THREE.PerspectiveCamera(70, elem.clientWidth / elem.clientHeight, 1, 1000);

  /* Now, we can create the renderer object. I set alpha to true, so that it
  would have no background, and just use the page’s background. We also set
  the size of the renderer to the element’s size, and add the renderer’s object
  to our element with addChild. */
  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(elem.clientWidth, elem.clientHeight);
  elem.appendChild(renderer.domElement);

  /* We want it to be able to handle the page being resized, since this blog
  is designed to be responsive, so we add an event listener that resets the
  renderer’s size as needed. */
  window.addEventListener('resize', function () {
    renderer.setSize(elem.clientWidth, elem.clientHeight);
    camera.aspect = elem.clientWidth / elem.clientHeight;
    camera.updateProjectionMatrix();
  }, false);

  /* Next, we’ll configure the controls using OrbitControls. */
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.rotateSpeed = 0.6;
  controls.dampingFactor = 0.2;
  controls.enableZoom = true;
  // controls.autoRotate = true;
  // controls.autoRotateSpeed = .75;

  /* Finally, we can start to set the scene. We’ll start with some simple lighting
  - in this case, a hemisphere light from above. It won’t light the bottom of the
  model, but it is easy enough to add additional lights here if that is an issue. */
  var scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x787878, 0.8));

  /* Next, we can load our STL file using three.js’s STL loader. The loader only
  returns a geometry, so we also need to generate a material for it - in this case,
  it is a somewhat shiny orange, since I like to 3D print in orange PLA. */
  const loader = new THREE.STLLoader();
  loader.load(model, (geometry) => {
    process(camera, renderer, controls, scene, geometry);
  });
}

viewer.process = (camera, renderer, controls, scene, geometry) => {
  var material = new THREE.MeshPhongMaterial({
    color: 0xf0f0f0,
    specular: 0xf8f8f8,
    shininess: 0,
    reflectivity: 0
  });
  var mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  /* Now our mesh is loaded, but we need to figure out a way to center it. I used
  three.js’s computeBoundingBox and getCenter helper functions to find the center
  of the mesh’s bounding box, and then just translated it’s position there: */
  var middle = new THREE.Vector3();
  geometry.computeBoundingBox();
  geometry.boundingBox.getCenter(middle);
  mesh.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(
    -middle.x, -middle.y, -middle.z));
  mesh.geometry.rotateY(-Math.PI / 5);
  /* We also want to pull the camera away so that it is a reasonable size. Again
  I used the element’s bounding box, picked the largest dimension, and pulled the
  camera away by 1.5 times that. This may not be ideal, but it seems to work well
  enough so far. */
  var largestDimension = Math.max(geometry.boundingBox.max.x,
    geometry.boundingBox.max.y,
    geometry.boundingBox.max.z)
  camera.position.z = largestDimension * 2.5;
  var animate = function () {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  animate();
}

viewer.upload = (event) => {
  const elementID = "model";
  document.querySelector("#model").innerHTML = "";
  var file = event.target.files[0];
  var reader = new FileReader();
  reader.onload = function (e) {
    /* Now we can actually start writing JavaScript. We’ll be defining a simple
    function to act as the STL viewer, given the path to the STL file, and the
    ID of the element that it takes. */
    var elem = document.getElementById(elementID);

    /* Then, we create the camera using three.js. We use information about the
    element’s size to determine the aspect ratio, and we use arguments 1 and
    1000 to indicate that the camera should clip things closer than 1 unit away
    and further than 1000 units away. */
    var camera = new THREE.PerspectiveCamera(70, elem.clientWidth / elem.clientHeight, 1, 1000);

    /* Now, we can create the renderer object. I set alpha to true, so that it
    would have no background, and just use the page’s background. We also set
    the size of the renderer to the element’s size, and add the renderer’s object
    to our element with addChild. */
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(elem.clientWidth, elem.clientHeight);
    elem.appendChild(renderer.domElement);

    /* We want it to be able to handle the page being resized, since this blog
    is designed to be responsive, so we add an event listener that resets the
    renderer’s size as needed. */
    window.addEventListener('resize', function () {
      renderer.setSize(elem.clientWidth, elem.clientHeight);
      camera.aspect = elem.clientWidth / elem.clientHeight;
      camera.updateProjectionMatrix();
    }, false);

    /* Next, we’ll configure the controls using OrbitControls. */
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.rotateSpeed = 0.6;
    controls.dampingFactor = 0.2;
    controls.enableZoom = true;
    // controls.autoRotate = true;
    // controls.autoRotateSpeed = .75;

    /* Finally, we can start to set the scene. We’ll start with some simple lighting
    - in this case, a hemisphere light from above. It won’t light the bottom of the
    model, but it is easy enough to add additional lights here if that is an issue. */
    var scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x787878, 0.8));

    /* Next, we can load our STL file using three.js’s STL loader. The loader only
    returns a geometry, so we also need to generate a material for it - in this case,
    it is a somewhat shiny orange, since I like to 3D print in orange PLA. */
    const loader = new THREE.STLLoader();
    let geometry = loader.parse(e.target.result);
    process(camera, renderer, controls, scene, geometry);
  };
  reader.readAsBinaryString(file);
}