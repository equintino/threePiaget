import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.174.0/three.module.min.js';
import { OrbitControls } from './lib/orbitControls.js';
import { CharacterControls } from './lib/characterControls.js';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { DRACOLoader } from './lib/DRACOLoader.js';

let scene, camera, renderer, clock, textureLoader, controls
let characterControls, model, mixer, mesh
let animationsMap = new Map();

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 0.1, 1000
    );

    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    clock = new THREE.Clock();
    textureLoader = new THREE.TextureLoader(); // Load textures here

    view(renderer)
    lights()
    setControls()
    animate()
}
init()
// test()

function view(renderer) {
    document.body.appendChild(renderer.domElement);
}

function lights() {
    const light = new THREE.DirectionalLight(0xFFFFFF, 4);
    light.position.set(5, 10, 2);
    light.castShadow = true;
    scene.add(light);

    const skyColor = 0xB1E1FF; // light blue
    const groundColor = 0xB97A20; // brownish orange
    const intensity = 2;
    const hemisphereLight = new THREE.HemisphereLight(
        skyColor, groundColor, intensity
    );
    scene.add( hemisphereLight );
}

function setControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.update();
}

const loadingManager = new THREE.LoadingManager( () => {
    const loadingScreen = document.getElementById( 'loading-screen' );
    loadingScreen.classList.add( 'fade-out' );

    // optional: remove loader from DOM via event listener
    loadingScreen.addEventListener( 'transitionend', (event) => {
        event.target.remove();
    });

} )

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
    const gltfLoader = new GLTFLoader( loadingManager );
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/gltf/');

    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load('file/PAEC2.glb', function(gltf) {
        model = gltf.scene;
        // mesh = model

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

        characterControls = new CharacterControls(
            model, mixer, animationsMap, controls, camera, 'Idle'
        );

        // compute the box that contains all the stuff
        // from root and below
        const box = new THREE.Box3().setFromObject( model );

        const boxSize = box.getSize( new THREE.Vector3() ).length();
        const boxCenter = box.getCenter( new THREE.Vector3() );

        // set the camera to frame the box
        frameArea( boxSize * 0.5, boxSize, boxCenter, camera );

    }, function(e) {
        let percent = parseInt(e.loaded/e.total * 100)
    }, function(error) {
        console.error("GLB Load Error in Worker:", error);
    });

    // /** Get Mouse Position */
    // const canvas = document.querySelector('canvas')
    // canvas.addEventListener('click', getMousePosition)

}

function animate() {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// function test() {
//     const intersection = {
//         intersects: false,
//         point: new THREE.Vector3(),
//         normal: new THREE.Vector3()
//     };
//     // const mouse = new THREE.Vector2();
//     const mouse = new THREE.Vector2(1, 1);
//     let intersects = [];

//     const position = new THREE.Vector3();
//     const orientation = new THREE.Euler();
//     const raycaster = new THREE.Raycaster();
//     const size = new THREE.Vector3( 10, 10, 10 );

//     let moved = false
//     window.addEventListener( 'pointerup', function ( event ) {
//         if ( moved === false ) {
//             checkIntersection( event.clientX, event.clientY );
//             // if ( intersection.intersects ) shoot();
//         }
//     } );

//     window.addEventListener( 'pointermove', onPointerMove );

//     function onPointerMove( event ) {
//         if ( event.isPrimary ) {
//             checkIntersection( event.clientX, event.clientY );
//         }
//     }

//     function checkIntersection( x, y ) {
//         if ( model === undefined ) return;

//         mouse.x = ( x / window.innerWidth ) * 2 - 1;
//         mouse.y = - ( y / window.innerHeight ) * 2 + 1;

//         raycaster.setFromCamera( mouse, camera );
//         intersects = raycaster.intersectObject( model );

//         if ( intersects.length > 0 ) {
//             const name = intersects[0].object.name
//             const info = document.querySelector('#text')
//             if (name.indexOf('Base') !== -1) {
//                 info.innerText = `Informação do Sensor ${name}!!!`
//             }
//             else {
//                 info.innerText = ''
//             }
//             // const p = intersects[ 0 ].point;
//             // mouseHelper.position.copy( p );
//             // intersection.point.copy( p );

//             // const normalMatrix = new THREE.Matrix3().getNormalMatrix( mesh.matrixWorld );

//             // const n = intersects[ 0 ].face.normal.clone();
//             // n.applyNormalMatrix( normalMatrix );
//             // n.multiplyScalar( 10 );
//             // n.add( intersects[ 0 ].point );

//             // intersection.normal.copy( intersects[ 0 ].face.normal );
//             // mouseHelper.lookAt( n );

//             // positions = line.geometry.attributes.position;
//             // positions.setXYZ( 0, p.x, p.y, p.z );
//             // positions.setXYZ( 1, n.x, n.y, n.z );
//             // positions.needsUpdate = true;
//             // intersection.intersects = true;
//             // intersects.length = 0;
//         } else {
//             intersection.intersects = false;
//         }
//     }
// }

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

// function getMousePosition( event ) {
//     let posX = event.clientX
//     let posY = event.clientY
//     // if (posX === 329 || posY === 109) {
//         console.log(
//             worldPointFromScreenPoint(event, camera),
//             'posX', posX,
//             'posY', posY
//         )
//     // }
// }

// function worldPointFromScreenPoint( screenPoint, camera ) {
//     let worldPoint = new THREE.Vector3()
//     worldPoint.x = screenPoint.x
//     worldPoint.y = screenPoint.y
//     worldPoint.z = 0
//     worldPoint.unproject ( camera )
//     return worldPoint
// }

// function onPointerDown( event ) {
//     // relactive screen position
//     const rect = this.dom.getBoundingClientRect()
//     let viewportDown = new THREE.Vector2()
//     viewportDown.x = ((( event.clientX - rect.left ) / rect.width ) * 2 ) - 1
//     viewportDown.y = - ((( event.clientY - rect.top ) / rect.height ) * 2 ) + 1

//     //get dot 3d
//     let my3dPosition = worldPointFromScreenPoint( viewportDown, mySceneCamera )
// }
