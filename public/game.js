import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { io } from 'socket.io-client';

// Socket.io connection
const socket = io('https://truck-game-server.onrender.com');

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);

// Physics world setup
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0)
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundVisualMaterial = new THREE.MeshStandardMaterial({ color: 0x3a7d44 });
const ground = new THREE.Mesh(groundGeometry, groundVisualMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Ground physics body
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({
    mass: 0,
    shape: groundShape
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// Store other players
const otherPlayers = {};

// Create truck function
function createTruck(color = 0x3498db) {
    const truckGroup = new THREE.Group();
    
    // Truck body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    truckGroup.add(body);

    // Truck cabin
    const cabinGeometry = new THREE.BoxGeometry(1.5, 1, 1.5);
    const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0x2980b9 });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 1.5, -0.5);
    truckGroup.add(cabin);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 32);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

    const wheelPositions = [
        { x: -1, y: 0.5, z: 1.5 },
        { x: 1, y: 0.5, z: 1.5 },
        { x: -1, y: 0.5, z: -1.5 },
        { x: 1, y: 0.5, z: -1.5 }
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos.x, pos.y, pos.z);
        wheel.rotation.z = Math.PI / 2;
        truckGroup.add(wheel);
    });

    return truckGroup;
}

// Create local player
const localTruck = createTruck();
scene.add(localTruck);

// Local player physics
const truckShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
const truckBody = new CANNON.Body({
    mass: 1000,
    shape: truckShape,
    position: new CANNON.Vec3(0, 1, 0),
    material: new CANNON.Material('truckMaterial')
});
truckBody.linearDamping = 0.1;
truckBody.angularDamping = 0.1;
world.addBody(truckBody);

// Create a material for the ground
const groundPhysicsMaterial = new CANNON.Material('groundMaterial');
const truckGroundContactMaterial = new CANNON.ContactMaterial(
    groundPhysicsMaterial,
    truckBody.material,
    {
        friction: 0.5,
        restitution: 0.3
    }
);
world.addContactMaterial(truckGroundContactMaterial);
groundBody.material = groundPhysicsMaterial;

// Create obstacles
const obstacles = [];
const obstacleCount = 10;

for (let i = 0; i < obstacleCount; i++) {
    const x = (Math.random() - 0.5) * 40;
    const z = (Math.random() - 0.5) * 40;
    const size = 1 + Math.random() * 2;
    
    const obstacleGeometry = new THREE.BoxGeometry(size, size, size);
    const obstacleMaterial = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(Math.random(), Math.random(), Math.random())
    });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.set(x, size/2, z);
    scene.add(obstacle);
    
    const obstacleShape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
    const obstacleBody = new CANNON.Body({
        mass: 100,
        shape: obstacleShape,
        position: new CANNON.Vec3(x, size/2, z)
    });
    world.addBody(obstacleBody);
    
    obstacles.push({
        mesh: obstacle,
        body: obstacleBody
    });
}

// Camera position
camera.position.set(0, 5, 10);
camera.lookAt(localTruck.position);

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

// Game variables
const moveSpeed = 0.3;  // Increased movement speed
const turnSpeed = 0.08; // Increased turn speed

// Socket.io event handlers
socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach(id => {
        if (id !== socket.id) {
            addOtherPlayer(id, players[id]);
        }
    });
});

socket.on('newPlayer', (playerInfo) => {
    addOtherPlayer(playerInfo.id, playerInfo);
});

socket.on('playerMoved', (playerInfo) => {
    if (otherPlayers[playerInfo.id]) {
        otherPlayers[playerInfo.id].truck.position.set(
            playerInfo.position.x,
            playerInfo.position.y,
            playerInfo.position.z
        );
        otherPlayers[playerInfo.id].truck.rotation.set(
            playerInfo.rotation.x,
            playerInfo.rotation.y,
            playerInfo.rotation.z
        );
    }
});

socket.on('playerDisconnected', (playerId) => {
    if (otherPlayers[playerId]) {
        scene.remove(otherPlayers[playerId].truck);
        delete otherPlayers[playerId];
    }
});

function addOtherPlayer(id, playerInfo) {
    const truck = createTruck(playerInfo.color);
    truck.position.set(
        playerInfo.position.x,
        playerInfo.position.y,
        playerInfo.position.z
    );
    truck.rotation.set(
        playerInfo.rotation.x,
        playerInfo.rotation.y,
        playerInfo.rotation.z
    );
    scene.add(truck);
    otherPlayers[id] = { truck };
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update physics
    world.step(1/60);

    // Update local truck position and rotation based on physics
    localTruck.position.copy(truckBody.position);
    localTruck.quaternion.copy(truckBody.quaternion);

    // Movement controls
    if (keys.w) {
        // Move forward
        const forward = new CANNON.Vec3(
            Math.sin(truckBody.quaternion.y) * moveSpeed,
            0,
            Math.cos(truckBody.quaternion.y) * moveSpeed
        );
        truckBody.position.vadd(forward, truckBody.position);
    }
    if (keys.s) {
        // Move backward
        const backward = new CANNON.Vec3(
            -Math.sin(truckBody.quaternion.y) * moveSpeed,
            0,
            -Math.cos(truckBody.quaternion.y) * moveSpeed
        );
        truckBody.position.vadd(backward, truckBody.position);
    }
    if (keys.a) {
        // Turn left
        truckBody.quaternion.y += turnSpeed;
    }
    if (keys.d) {
        // Turn right
        truckBody.quaternion.y -= turnSpeed;
    }

    // Update obstacle positions
    obstacles.forEach(obstacle => {
        obstacle.mesh.position.copy(obstacle.body.position);
        obstacle.mesh.quaternion.copy(obstacle.body.quaternion);
    });

    // Update camera position to follow truck
    camera.position.x = localTruck.position.x - Math.sin(localTruck.rotation.y) * 10;
    camera.position.z = localTruck.position.z - Math.cos(localTruck.rotation.y) * 10;
    camera.lookAt(localTruck.position);

    // Send position update to server
    socket.emit('playerMovement', {
        position: {
            x: localTruck.position.x,
            y: localTruck.position.y,
            z: localTruck.position.z
        },
        rotation: {
            x: localTruck.rotation.x,
            y: localTruck.rotation.y,
            z: localTruck.rotation.z
        }
    });

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate(); 