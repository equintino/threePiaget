import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.174.0/three.module.min.js';
import { OrbitControls } from './lib/orbitControls.js';
import { CharacterControls } from './lib/characterControls.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { DRACOLoader } from './lib/DRACOLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader(); // Load textures here

const light = new THREE.DirectionalLight(0xFFFFFF, 4);
light.position.set(5, 10, 2);
light.castShadow = true;
scene.add(light);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();

let characterControls, model, mixer;
let animationsMap = new Map();

{

    const skyColor = 0xB1E1FF; // light blue
    const groundColor = 0xB97A20; // brownish orange
    const intensity = 2;
    const light = new THREE.HemisphereLight( skyColor, groundColor, intensity );
    scene.add( light );

}

let onWorker = false

if (onWorker) {
    const worker = new Worker("onWorker.js");
    worker.postMessage({ loadGLB: true });

    worker.onmessage = function(event) {
        if (event.data.model) {
            const loader = new THREE.ObjectLoader();
            model = loader.parse(event.data.model);
            scene.add(model);
            camera.lookAt(model.position);
            console.log("GLB Loaded via Web Worker");

            mixer = new THREE.AnimationMixer(model);
            animationsMap = new Map();

            event.data.animations.forEach(name => {
                const clip = THREE.AnimationClip.findByName(model.animations, name);
                if (clip) {
                    const action = mixer.clipAction(clip);
                    action.play();
                    animationsMap.set(name, action);
                }
            });

            characterControls = new CharacterControls(model, mixer, animationsMap, controls, camera, 'Idle');

            // *Apply textures received from Web Worker*
            if (event.data.textures) {
                model.traverse((obj) => {
                    if (obj.isMesh && event.data.textures[obj.id]) {
                        obj.material.map = textureLoader.load(event.data.textures[obj.id]);
                        obj.material.needsUpdate = true;
                    }
                });
            }
        }
    };
}
else {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');

    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load('file/PAEC2.glb', function(gltf) {
        const model = gltf.scene;

        scene.add(model);
        camera.lookAt(model.position);

        mixer = new THREE.AnimationMixer(model);
        animationsMap = new Map();

        // Merge animations by playing all clips together
        gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.play(); // Play all animations simultaneously
            animationsMap.set(clip.name, action);
        });

        characterControls = new CharacterControls(model, mixer, animationsMap, controls, camera, 'Idle');

        // compute the box that contains all the stuff
        // from root and below
        const box = new THREE.Box3().setFromObject( model );

        const boxSize = box.getSize( new THREE.Vector3() ).length();
        const boxCenter = box.getCenter( new THREE.Vector3() );

        // set the camera to frame the box
        frameArea( boxSize * 0.5, boxSize, boxCenter, camera );

    }, function(e) {
        let percent = parseInt(e.loaded/e.total * 100)
        document.querySelector('progress').value = percent
        document.querySelector('progress').innerHTML = percent
    }, function(error) {
        console.error("GLB Load Error in Worker:", error);
    });
}

function animate() {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();

function frameArea( sizeToFitOnScreen, boxSize, boxCenter, camera ) {

    const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
    const halfFovY = THREE.MathUtils.degToRad( camera.fov * .5 );
    const distance = halfSizeToFitOnScreen / Math.tan( halfFovY );
    // compute a unit vector that points in the direction the camera is now
    // in the xz plane from the center of the box
    const direction = ( new THREE.Vector3() )
        .subVectors( camera.position, boxCenter )
        .multiply( new THREE.Vector3( 1, 0, 1 ) )
        .normalize();

    // move the camera to a position distance units way from the center
    // in whatever direction the camera was from the center already
    camera.position.copy( direction.multiplyScalar( distance ).add( boxCenter ) );

    // pick some near and far values for the frustum that
    // will contain the box.
    camera.near = boxSize / 100;
    camera.far = boxSize * 100;

    camera.updateProjectionMatrix();

    // point the camera to look at the center of the box
    camera.lookAt( boxCenter.x, boxCenter.y, boxCenter.z );

}
