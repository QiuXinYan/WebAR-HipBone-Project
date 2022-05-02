import * as THREE from 'three';

import { UIPanel, UIRow } from './libs/ui.js';
import { AddObjectCommand } from './commands/AddObjectCommand.js';
function MenubarExamples( editor ) {

	const strings = editor.strings;

	const container = new UIPanel();
	container.setClass( 'menu' );

	const title = new UIPanel();
	title.setClass( 'title' );
	title.setTextContent( strings.getKey( 'menubar/examples' ) );
	container.add( title );

	const options = new UIPanel();
	options.setClass( 'options' );
	container.add( options );

	// Examples

	const items = [
		{ title: 'menubar/examples/kuanguscene', file: 'kuanguscene.json' },
	];




	const loader = new THREE.FileLoader();

	for ( let i = 0; i < items.length; i ++ ) {

		( function ( i ) {

			const item = items[ i ];

			const option = new UIRow();
			option.setClass( 'option' );
			option.setTextContent( strings.getKey( item.title ) );
			option.onClick( function () {

				if ( confirm( 'Any unsaved data will be lost. Are you sure?' ) ) {

					const loader = new THREE.ObjectLoader();

					loader.load(
						// resource URL
						'examples/' + item.file,

						// onLoad callback
						// Here the loaded data is assumed to be an object
						function ( obj ) {
							// Add the loaded object to the scene
							console.log(obj);
							editor.execute( new AddObjectCommand( editor, obj ) );
						},

						// onProgress callback
						function ( xhr ) {
							console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
						},

						// onError callback
						function ( err ) {
							console.error( 'An error happened' );
						}
					);		
				}

			} );
			options.add( option );

		} )( i );

	}

	return container;

}

export { MenubarExamples };
