self.importScripts('https://cdn.jsdelivr.net/npm/three@latest/build/three.min.js');
self.importScripts('https://cdn.jsdelivr.net/npm/three@latest/examples/js/loaders/GLTFLoader.js');
self.importScripts('https://cdn.jsdelivr.net/npm/three@latest/examples/js/loaders/DRACOLoader.js');

const gltfLoader = new THREE.GLTFLoader();

self.onmessage = function(event) {
    if (event.data.loadGLB) {
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('/draco/gltf/');

        gltfLoader.setDRACOLoader(dracoLoader);

        gltfLoader.load('file/PAEC2.glb', function(gltf) {
            const model = gltf.scene;

            // Collect texture paths
            let texturePaths = [];
            model.traverse((obj) => {
                if (obj.isMesh && obj.material.map) {
                    texturePaths.push(obj.material.map.source.data.src);
                }
            });

            let _model = model.toJSON()
            let model2 = {}

            for (let i in _model) {
                if (i !== 'images' && i !== 'textures') {
                    model2[i] = _model[i]
                }
            }

            self.postMessage({
                model: model2,
                animations: gltf.animations.map(clip => clip.name),
                textures: texturePaths, // Send textures separately
                test: JSON.stringify(model)
            });
        }, undefined, function(error) {
            console.error("GLB Load Error in Worker:", error);
        });
    }
};
