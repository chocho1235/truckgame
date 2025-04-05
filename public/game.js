import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { io } from 'socket.io-client';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Physics world
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Socket.io connection
const socket = io('http://localhost:3000');

// Game variables
const moveSpeed = 0.3;
const turnSpeed = 0.08;

// Controls
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key.toLowerCase()] = false;
    }
});

// Create truck
const truckGeometry = new THREE.BoxGeometry(2, 1, 4);
const truckMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const truck = new THREE.Mesh(truckGeometry, truckMaterial);
scene.add(truck);

// Create truck physics body
const truckShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
const truckBody = new CANNON.Body({
    mass: 1,
    shape: truckShape,
    position: new CANNON.Vec3(0, 1, 0)
});
world.addBody(truckBody);

// Set camera position
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update physics
    world.step(1/60);

    // Update truck position and rotation
    truck.position.copy(truckBody.position);
    truck.quaternion.copy(truckBody.quaternion);

    // Movement controls
    if (keys.w) {
        const forward = new CANNON.Vec3(
            Math.sin(truckBody.quaternion.y) * moveSpeed,
            0,
            Math.cos(truckBody.quaternion.y) * moveSpeed
        );
        truckBody.position.vadd(forward, truckBody.position);
    }
    if (keys.s) {
        const backward = new CANNON.Vec3(
            -Math.sin(truckBody.quaternion.y) * moveSpeed,
            0,
            -Math.cos(truckBody.quaternion.y) * moveSpeed
        );
        truckBody.position.vadd(backward, truckBody.position);
    }
    if (keys.a) {
        truckBody.quaternion.y += turnSpeed;
    }
    if (keys.d) {
        truckBody.quaternion.y -= turnSpeed;
    }

    // Update camera to follow truck
    camera.position.x = truck.position.x;
    camera.position.z = truck.position.z + 10;
    camera.lookAt(truck.position);

    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}); 