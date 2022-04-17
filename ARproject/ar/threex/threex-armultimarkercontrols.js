var ARjs = ARjs || {}
var THREEx = THREEx || {}

ARjs.MarkersAreaControls = THREEx.ArMultiMarkerControls = function(subMarkersControls){

	if( arguments.length > 6 )	console.assert('wrong api for', THREEx.ArMultiMarkerControls)

	// honor obsolete stuff - add a warning to use
	this.subMarkersControls = subMarkersControls

}

ARjs.MarkersAreaControls.prototype = Object.create( THREEx.ArBaseControls.prototype );
ARjs.MarkersAreaControls.prototype.constructor = ARjs.MarkersAreaControls;


//////////////////////////////////////////////////////////////////////////////
//		Utility functions
//////////////////////////////////////////////////////////////////////////////
/**
 * from http://wiki.unity3d.com/index.php/Averaging_Quaternions_and_Vectors
 */
ARjs.MarkersAreaControls.averageQuaternion = function(quaternionSum, newQuaternion, firstQuaternion, count, quaternionAverage){
	quaternionAverage = quaternionAverage || new THREE.Quaternion()
	// sanity check
	console.assert(firstQuaternion instanceof THREE.Quaternion === true)
	
	if( newQuaternion.dot(firstQuaternion) > 0 ){
		newQuaternion = new THREE.Quaternion(-newQuaternion.x, -newQuaternion.y, -newQuaternion.z, -newQuaternion.w)
	}

	quaternionSum.x += newQuaternion.x
	quaternionSum.y += newQuaternion.y
	quaternionSum.z += newQuaternion.z
	quaternionSum.w += newQuaternion.w
	
	quaternionAverage.x = quaternionSum.x/count
	quaternionAverage.y = quaternionSum.y/count
	quaternionAverage.z = quaternionSum.z/count
	quaternionAverage.w = quaternionSum.w/count
	
	quaternionAverage.normalize()

	return quaternionAverage
}


ARjs.MarkersAreaControls.averageVector3 = function(vector3Sum, vector3, count, vector3Average){
	vector3Average = vector3Average || new THREE.Vector3()
	
	vector3Sum.x += vector3.x
	vector3Sum.y += vector3.y
	vector3Sum.z += vector3.z
	
	vector3Average.x = vector3Sum.x / count
	vector3Average.y = vector3Sum.y / count
	vector3Average.z = vector3Sum.z / count
	
	return vector3Average
}




/**
 * core function in AR multiple markers registration
 */
ARjs.MarkersAreaControls.changeObjectPosition = function(subMarkerControls, markerRoot, te) {
	var stats = {
		count : 0,
		position : {
			sum: new THREE.Vector3(0,0,0),
			average: new THREE.Vector3(0,0,0),						
		},
		quaternion : {
			sum: new THREE.Quaternion(0,0,0,0),
			average: new THREE.Quaternion(0,0,0,0),						
		},
		scale : {
			sum: new THREE.Vector3(0,0,0),
			average: new THREE.Vector3(0,0,0),						
		},
	}

	//原始的control
	var originControl = subMarkerControls[0]; 
	let visibleControls = [];
	let visibleCount = 0;

	for(var i = 0; i < subMarkerControls.length; i++) {
		var markerObject3d = subMarkerControls[i].object3d;
		if(markerObject3d.visible == true) {
			visibleControls[visibleCount++] = subMarkerControls[i];
		}
	}

	for(var i = 0; i < visibleControls.length; i++) {
		var markerObject3d = visibleControls[i].object3d;
		stats.count++;
		var tmpMatrix = new THREE.Matrix4();
		// compute markerControls1 position/quaternion/scale in relation with markerControls
		tmpMatrix.getInverse(originControl.object3d.matrix)
		tmpMatrix.multiply(markerObject3d.matrix)
		// decompose the matrix into .position, .quaternion, .scale
		var position = new THREE.Vector3();
		var quaternion = new THREE.Quaternion()
		var scale = new THREE.Vector3();
		var firstQuaternion = new THREE.Quaternion()
		tmpMatrix.decompose(position, quaternion, scale)
		ARjs.MarkersAreaControls.averageVector3(stats.position.sum, position, stats.count, stats.position.average)
		ARjs.MarkersAreaControls.averageQuaternion(stats.quaternion.sum, quaternion, firstQuaternion, stats.count, stats.quaternion.average)
		ARjs.MarkersAreaControls.averageVector3(stats.scale.sum, scale, stats.count, stats.scale.average)
	}
	//powerful algorithm for filtering noisy real-time signals
	if(stats.count > 0) {
		var lerpsValues = 
		[
			[0.3+.1, 0.1, 0.3],
			[0.4+.1, 0.1, 0.4],
			[0.4+.1, 0.2, 0.5],
			[0.5+.1, 0.2, 0.7],
			[0.5+.1, 0.2, 0.7],
		]
		// find the good lerpValues
		if( lerpsValues[visibleCount-1] !== undefined ){
			var lerpValue = lerpsValues[visibleCount-1]
		}else{
			var lerpValue = lerpsValues[lerpsValues.length-1]
		}

		markerRoot.position.lerp(stats.position.average,lerpValue[0]);
		markerRoot.scale.lerp(stats.scale.average,lerpValue[1]);
		markerRoot.quaternion.slerp(stats.quaternion.average,lerpValue[2]);
	}	
	console.log(stats.count);
}


ARjs.MarkersAreaControls.updateSmoothedControls = function(subMarkerControls,smoothedControls, lerpsValues){
	// handle default values
	if( lerpsValues === undefined ){
		lerpsValues = [
			[0.3+.1, 0.1, 0.3],
			[0.4+.1, 0.1, 0.4],
			[0.4+.1, 0.2, 0.5],
			[0.5+.1, 0.2, 0.7],
			[0.5+.1, 0.2, 0.7],
		]
	}
	
	// count how many subMarkersControls are visible
	var nVisible = 0

	for(var i = 0; i < subMarkerControls.length; i++) {
		var markerObject3d = subMarkerControls[i].object3d
		if( markerObject3d.visible === true )	nVisible ++
	}

	// find the good lerpValues
	if( lerpsValues[nVisible-1] !== undefined ){
		var lerpValues = lerpsValues[nVisible-1]
	}else{
		var lerpValues = lerpsValues[lerpsValues.length-1]
	}

	// modify lerpValues in smoothedControls
	smoothedControls.parameters.lerpPosition = lerpValues[0]
	smoothedControls.parameters.lerpQuaternion = lerpValues[1]
	smoothedControls.parameters.lerpScale = lerpValues[2]
	console.log("nVisible:" + nVisible);
}
