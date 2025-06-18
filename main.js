import * as THREE from 'https://cdn.skypack.dev/three@0.133.0'
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls  } from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/libs/dat.gui.module'


// atribuindo o DOM
const div = document.createElement('div')
div.setAttribute('id', 'myCanvas')
document.querySelector('body').appendChild(div)

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const devicePixelRatio = window.devicePixelRatio
let renderer, scene, camera, mixer, mesh, raycaster, moved, position, orientation,
size, intersects, loadingManager

//controles em tempo real
// const gui = new GUI()

const clock = new THREE.Clock()

// Performing functions
init()
gltfLoader('file/PAEC2.glb')
controls()
lights()
render()
tick()
mouseInteraction()

// Custom here your messages
const popup = {
    gotinha1: 'Gotinha 1',
    gotinha2: 'Gotinha 2'
}

function init() {
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(devicePixelRatio)
    div.appendChild(renderer.domElement)

    // Scene
    scene = new THREE.Scene()

    // Camera
    camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)
    camera.position.set(-10, 15, 30)
    scene.add(camera)

    // Loading
    loadingManager = new THREE.LoadingManager( () => {
        const loadingScreen = document.getElementById( 'loading-screen' );
        loadingScreen.classList.add( 'fade-out' );

        // optional: remove loader from DOM via event listener
        loadingScreen.addEventListener( 'transitionend', onTransitionEnd );

    } )
}

function mouseInteraction() {
    const intersection = {
        intersects: false,
        point: new THREE.Vector3(),
        normal: new THREE.Vector3()
    };

    const mouse = new THREE.Vector2(1, 1);
    intersects = [];

    position = new THREE.Vector3();
    orientation = new THREE.Euler();
    raycaster = new THREE.Raycaster();
    size = new THREE.Vector3( 10, 10, 10 );

    moved = false
    window.addEventListener( 'pointerup', function ( event ) {
        if ( moved === false ) {
            checkIntersection( event.clientX, event.clientY );
        }
    } );

    window.addEventListener( 'pointermove', onPointerMove );

    function onPointerMove( event ) {
        if ( event.isPrimary ) {
            checkIntersection( event.clientX, event.clientY );
        }
    }

    function checkIntersection( x, y ) {
        if ( mesh === undefined ) return;

        mouse.x = ( x / window.innerWidth ) * 2 - 1;
        mouse.y = - ( y / window.innerHeight ) * 2 + 1;

        raycaster.setFromCamera( mouse, camera );
        intersects = raycaster.intersectObject( mesh );

        if ( intersects.length > 0 ) {
            const name = intersects[0].object.name
            const info = document.querySelector('#text')
            if (name.indexOf('Base') !== -1) {
                let msg
                switch (name) {
                    case 'Base001':
                        msg = popup.gotinha1
                        break
                    case 'Base002':
                        msg = popup.gotinha2
                }
                info.innerText = msg
            }
            else {
                info.innerText = ''
            }
        } else {
            intersection.intersects = false;
        }
    }
}

function onTransitionEnd( event ) {
	event.target.remove();
}

function lights() {
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.4, 100 )
    directionalLight.position.set( 3.1, 0, 1.1 )
    directionalLight.castShadow = true
    scene.add( directionalLight )
    // addControls('light3', directionalLight)

    const light4 = new THREE.DirectionalLight( 0xffffff, 0.5, 100 )
    light4.position.set( 0, 5, 1 )
    light4.castShadow = true
    light4.intensity = 0.5
    scene.add( light4 )
    // addControls('light', light4)

    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.AmbientLight(color, intensity);
    scene.add(light);
    // addControls('light2', light)
}

function render() {
    const delta = clock.getDelta()
    if ( mixer !== undefined ) mixer.update( delta );

    renderer.render(scene, camera)
}

function tick() {
    render()
    window.requestAnimationFrame(tick)
}

function gltfLoader(file) {
    const gltfLoader = new GLTFLoader( loadingManager )
    gltfLoader.load(file, (gltf) => {
        const animations = gltf.animations
        const object = gltf.scene
        mixer = new THREE.AnimationMixer( object )

        animations.forEach((e) => {
            mixer.clipAction(e).play()
        })
        scene.add(object)

        mesh = gltf.scene
    }, (loading) => {
        // const progress = document.querySelector('progress')
        // let percent = loading.loaded / loading.total * 100
        // progress.value = percent

        // percent === 100 ?
        //     progress.style.zIndex = -1
        //     : progress.style.zIndex = 10

    }, (error) => {
        console.log(
            error
        )
    })
}

function controls() {
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0, 0);
    controls.update();
    // addControls('controls', controls)

    controls.addEventListener( 'change', function () {
        moved = true;
    } );
}

function addControls(section, object=null) {
    if( section == 'camera' ){
        const cameraFolder = gui.addFolder('Camera')
        cameraFolder.add(object.position, 'x').min(-3).max(3)
        cameraFolder.add(object.position, 'y').min(1).max(5)
        cameraFolder.add(object.position, 'z').min(-1).max(1)
        cameraFolder.add(object.rotation, 'z').min(-5).max(5)
        cameraFolder.add(object.rotation, '_x').min(-5).max(5)
        cameraFolder.add(object.rotation, '_y').min(-5).max(5)
        cameraFolder.add(object.rotation, '_z').min(-5).max(5)
        // cameraFolder.add(camera.rotation, '').min(-5).max(5)
    }

    if( section == 'light' ){
        const lightFolder = gui.addFolder('Point Light 1')
        lightFolder.add(object.position, 'x').min(0).max(30)
        lightFolder.add(object.position, 'y').min(0).max(30)
        lightFolder.add(object.position, 'z').min(0).max(30)
        lightFolder.add(object, 'intensity').min(0).max(10)
        lightFolder.addColor(object, 'color')
    }

    if( section == 'light2' ){
        const lightFolder = gui.addFolder('Point Light 2')
        lightFolder.add(object, 'intensity').min(0).max(10)
    }

    if( section == 'light3' ){
        const lightFolder = gui.addFolder('Point Light 3')
        lightFolder.add(object.position, 'x').min(0).max(30)
        lightFolder.add(object.position, 'y').min(0).max(30)
        lightFolder.add(object.position, 'z').min(0).max(30)
        lightFolder.add(object, 'intensity').min(0).max(10)
        lightFolder.addColor(object, 'color')
    }

    if( section == 'controls' ){
        const controlFolder = gui.addFolder('Controls')
    }
}
