import * as THREE from 'three';

const rand = (min,max) => min + Math.random()*(max-min)

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


const cometgeometry = new THREE.SphereGeometry(0.3, 32, 16);
const cometmaterial = new THREE.MeshBasicMaterial( { color: 0xa02f60 } );

const comet = new THREE.Mesh ( cometgeometry, cometmaterial );
scene.add( comet );

camera.position.z = 40;
camera.position.x = 12;
camera.position.y = 10;

// particle shader
let vertexShader = `
attribute float alive;

void main() {
	gl_PointSize = alive * 0.3;

  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	gl_Position = projectionMatrix * mvPosition;
}
`;

let fragmentShader = `
void main() {
	gl_FragColor = vec4(1.0, 0.8, 1.0, 1.0);
}
`;

// particle setup
const MAX_PARTICLES = 10000;

const alive = [];
const positions = [];
const velocities = [];
const accelerations = [];
const ttl = [];

let geometry = new THREE.BufferGeometry();

for (let i=0; i<MAX_PARTICLES; i++) {
	positions.push(0);
	positions.push(0);
	positions.push(0);

	velocities.push(0);
	velocities.push(0);
	velocities.push(0);

	accelerations.push(0);
	accelerations.push(0);
	accelerations.push(0);

	ttl.push(0);
	alive.push(0);
}

geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
geometry.setAttribute('alive', new THREE.Uint8BufferAttribute(alive, 1).setUsage(THREE.DynamicDrawUsage));

const particleMat = new THREE.ShaderMaterial({
	vertexShader: vertexShader,
	fragmentShader: fragmentShader
});
// const particleMat = new THREE.PointsMaterial({color: 0xff0000, size:0.1});
const particleSystem = new THREE.Points(geometry, particleMat);
scene.add(particleSystem);


// t x y z
const keyframes = [
[0.0, 0.0, 0.0, 0.0],
[1.0, 5.0, 0.0, 0.0],
[2.0, 0.0, 0.0, 0.0],
[3.0, 8.0, 0.0, 0.0],
[4.0, 12.0, 12.0, 12.0],
[5.0, 12.0, 18.0, 18.0],
[6.0, 18.0, 18.0, 18.0],
[7.0, 18.0, 12.0, 18.0],
[8.0, 25.0, 12.0, 12.0],
[9.0, 25.0, 0.0, 18.0],
[10.0, 25.0, 1.0, 18.0],
[11.0, 0.0, 0.0, 0.0]
];


const lerp = (a, b, t) => a + t * (b-a);


let clock = new THREE.Clock(true);
let kf_i = 0;
let real_t = 0;
let live_i = 0;
const genRate = 5;

function animate() {
	requestAnimationFrame( animate );
	const tick = clock.getDelta();
	real_t += tick;

	let curr = keyframes[kf_i];
	let next = keyframes[kf_i+1];

	// bind t between 0 and 1
	let t = (real_t - curr[0]) / (next[0] - curr[0]);

	let x = lerp(curr[1], next[1], t);
	let y = lerp(curr[2], next[2], t);
	let z = lerp(curr[3], next[3], t);

	let dx = comet.position.x - x;
	let dy = comet.position.y - y;
	let dz = comet.position.z - z;

	// normalize velocites
	let dmag = Math.sqrt(dx*dx + dy*dy + dz*dz);
	dx /= dmag;
	dy /= dmag;
	dz /= dmag;


	comet.position.x = x;
	comet.position.y = y;
	comet.position.z = z;

	// Particles...
	const positions = geometry.attributes.position.array;
	const alives = geometry.attributes.alive.array;

	// Spawn generationRate new particles at our current positions
	for (let i=0; i<genRate; i++) {
		let p_i = (live_i+i) * 3;

		let px = rand(
			comet.position.x - 0.1,
			comet.position.x + 0.1
		);
		let py = rand(
			comet.position.y - 0.1,
			comet.position.y + 0.1
		);
		let pz = rand(
			comet.position.z - 0.1,
			comet.position.z + 0.1
		);

		positions[p_i] = px
		positions[p_i+1] = py
		positions[p_i+2] = pz

		let vx = rand(dx - 0.3, dx + 0.3);
		let vy = rand(dy - 0.3, dy + 0.3);
		let vz = rand(dz - 0.3, dz + 0.3);

		velocities[p_i] = vx * 0.1;
		velocities[p_i+1] = vy * 0.1;
		velocities[p_i+2] = vz * 0.1;

		alives[live_i+i] = 5;
		ttl[live_i+i] = rand(0.1, 0.5);
	}
	live_i += genRate;
	live_i %= MAX_PARTICLES;

	let sum = 0;
	for (let i=0; i<MAX_PARTICLES; i++) {
		if (alives[i] != 0.0) {
			sum += 1;
		}
	}
	console.log(sum);

	// Decrement ttl on all particles
	for (let i=0; i<ttl.length; i++) {
		ttl[i] -= tick;
	}

	// Kill off all particles where ttl <= 0
	for (let i=0; i<alives.length; i++) {
		if (alives[i] != 0 && ttl[i] <= 0) {
			alives[i] = 0.0;
		}
	}

	// gravity
	// for (let i=1; i<velocities.length; i+=3) {
		// velocities[i] -= 0.01;
	// }

	// damping
	for (let i=0; i<velocities.length; i++) {
		velocities[i] *= 0.90;
	}
	
	for (let i=0; i<positions.length; i++) {
		positions[i] += velocities[i];
	}

	geometry.attributes.position.needsUpdate = true;
	geometry.attributes.alive.needsUpdate = true;
	

	// increment keyframe if necessary
	if (t >= 1.0) {
		kf_i += 1;

		if (kf_i >= keyframes.length-1) {
			kf_i = 0;
			real_t = 0;
		}
	}
  
	renderer.render( scene, camera );
}
animate();
