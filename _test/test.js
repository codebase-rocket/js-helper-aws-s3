// Info: Test Cases
'use strict';

// Shared Dependencies
var Lib = {};

// Set Configrations
const cloud_storage_config = {
  'KEY': require('./.aws.json')['KEY'],
  'SECRET': require('./.aws.json')['SECRET'],
  'REGION': require('./.aws.json')['REGION']
};

// Dependencies
Lib.Utils = require('js-helper-utils');
Lib.Debug = require('js-helper-debug')(Lib);
Lib.Instance = require('js-helper-instance')(Lib);
const CloudStorage = require('js-helper-aws-s3')(Lib, cloud_storage_config);


////////////////////////////SIMILUTATIONS//////////////////////////////////////

function test_output(response){ // Result are from previous function

  Lib.Debug.log('Output:', response );

};

///////////////////////////////////////////////////////////////////////////////


/////////////////////////////STAGE SETUP///////////////////////////////////////

// Initialize 'instance'
var instance = Lib.Instance.initialize();

// Set test url
var bucket = 'dev-test-bucket-674';

///////////////////////////////////////////////////////////////////////////////


/////////////////////////////////TESTS/////////////////////////////////////////

/*
// Test getObjectsList()
CloudStorage.getObjectsList(
  instance,
  test_output,
  bucket
);
*/



// Test uploadFile()
CloudStorage.uploadFile(
  instance,
  test_output,
  bucket,
  'test_dir/plain.txt', // File Path
  'Hello World', // File Content
  'text/plain', // File Mime Type
  true // Make
);



/*
// Test getFile()
CloudStorage.getFile(
  instance,
  test_output,
  bucket,
  'test_dir/plain.txt', // File Path
  //true // output as buffer
);
*/



/*
// Test deleteFile()
CloudStorage.deleteFile(
  instance,
  test_output,
  bucket,
  'test_dir/plain.txt', // File Path
);
*/



/*
// Test deleteFiles()
CloudStorage.deleteFiles(
  instance,
  test_output,
  bucket,
  ['test_dir/plain1.txt', 'test_dir/plain2.txt'], // File Path
);
*/



/*
// Test copyFile()
CloudStorage.copyFile(
  instance,
  test_output,
  bucket, 'test_dir/plain.txt', // Source
  bucket, 'test_dir/plain1.txt', // Destination
);
*/



/*
// Test moveFile()
CloudStorage.moveFile(
  instance,
  test_output,
  bucket, 'test_dir/plain.txt', // Source
  bucket, 'test_dir/plain1.txt', // Destination
  true // Make public
);
*/

///////////////////////////////////////////////////////////////////////////////
