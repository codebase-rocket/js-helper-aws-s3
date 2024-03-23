// Info: Boilerplate library. Cloud File Storage. Contains Wraper Functions for AWS S3 functions
'use strict';

// Shared Dependencies (Managed by Loader)
let Lib = {};

// For lazy loading of AWS SDK Services
let S3Client,
  ListObjectsCommand,
  GetObjectCommand, PutObjectCommand,
  DeleteObjectCommand, DeleteObjectsCommand,
  CopyObjectCommand;

// Exclusive Dependencies
let CONFIG = require('./config'); // Loader can override it with Custom-Config


/////////////////////////// Module-Loader START ////////////////////////////////

  /********************************************************************
  Load dependencies and configurations

  @param {Set} shared_libs - Reference to libraries already loaded in memory by other modules
  @param {Set} config - Custom configuration in key-value pairs

  @return nothing
  *********************************************************************/
  const loader = function(shared_libs, config){

    // Shared Dependencies (Must be loaded in memory already)
    Lib.Utils = shared_libs.Utils;
    Lib.Debug = shared_libs.Debug;
    Lib.Instance = shared_libs.Instance;

    // Override default configuration
    if( !Lib.Utils.isNullOrUndefined(config) ){
      Object.assign(CONFIG, config); // Merge custom configuration with defaults
    }

  };

//////////////////////////// Module-Loader END /////////////////////////////////



///////////////////////////// Module Exports START /////////////////////////////
module.exports = function(shared_libs, config){

  // Run Loader
  loader(shared_libs, config);

  // Return Public Funtions of this module
  return CloudStorage;

};//////////////////////////// Module Exports END //////////////////////////////



///////////////////////////Public Functions START///////////////////////////////
const CloudStorage = { // Public functions accessible by other modules

  /********************************************************************
  Get All Files and Directories in a Bucket

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} bucket - S3 Bucket in which file is located
  @param {String} [prefix] - (Optional) Prefix. Default ''

  @return Thru request Callback.

  @callback - Request Callback
  * Note - no error is returned, instead 'false' is returned in case of error
  * @callback {String[]} list - List of first 1000 keys (we don't have use-case where more then 1000 files are present)
  * @callback {Boolean} list - false on unsuccessful or error

  * Example Output
  * some_dir/
  * some_dir/file1.txt
  * some_dir/file2.txt
  * file.txt
  *********************************************************************/
  getObjectsList: function(
    instance, cb,
    bucket, prefix
  ){

    // Initialize AWS service Object if not already Initialized
    _CloudStorage.initIfNot(instance);


    // Service Params
    var service_params = {
      'Bucket':  bucket,    // S3 Bucket in which file is located
      'Prefix':  prefix     // Prefix
    };

    // List 1000 files. Fast and we don't have use-case where more then 1000 files are present. (Otherwise have to use slow iterator)
    Lib.Debug.timingAuditLog('Start', 'AWS S3 - Get files list', instance['time_ms']);
    instance.aws.s3.send( new ListObjectsCommand(service_params) )

      .then(function(data){
        Lib.Debug.timingAuditLog('End', 'AWS S3 - Get files list', instance['time_ms']);

        // Return Empty Array if no list is returned
        if( Lib.Utils.isEmpty(data.Contents) ){
          return cb([]); // Retun empty array as files list and do not proceed
        }

        // Extract File names into array
        var files_list2 = data.Contents.map(function(file_info){
          return file_info['Key'];
        });

        // Return list of files
        cb(files_list2);

      })

      .catch(function(err){

        // Log error for research
        Lib.Debug.logErrorForResearch(
          err,
          'Cause: AWS S3' +
          '\ncmd: Get Files List' +
          '\nparams: ' + JSON.stringify(service_params)
        );

        // Invoke Callback. In case of S3 error, return false and not error.
        cb(false);

      });

  },


  /********************************************************************
  Upload File to S3
  Automatically overwrite's the file if it already exist

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} bucket - S3 Bucket in which file is to be uploaded
  @param {String} file_key - Full path of new file
  @param {String} file_content - new file content
  @param {String} file_type - new file mine type
  @param {Boolean} [is_public] - (Optional) Whether file will be publically accessible. Default false - Private

  @return  Thru request Callback.

  @callback - Request Callback
  * Note - no error is returned, instead 'false' is returned in case of error
  * @callback {Boolean} is_success - true on successful upload
  * @callback {Boolean} is_success - false on unsuccessful upload or error
  *********************************************************************/
  uploadFile: function(
    instance, cb,
    bucket, file_key, file_content, file_type,
    is_public
  ){

    // Initialize AWS service Object if not already Initialized
    _CloudStorage.initIfNot(instance);


    // Service Params
    var service_params = {
      'Bucket': bucket, // S3 Bucket in which file is to be uploaded
      'Key': file_key, // New File name with path
      'Body': file_content, // Direct file object from memory
      'ContentType': file_type // File content type
    };

    // Add Optional Parameters to above object
    // Access Permissions - private | public-read | public-read-write | authenticated-read | aws-exec-read | bucket-owner-read | bucket-owner-full-control
    if( !Lib.Utils.isNullOrUndefined(is_public) && is_public ){ // If file is public, set access permission to 'public-read'
      service_params['ACL'] = 'public-read';
    }
    else{
      service_params['ACL'] = 'private';
    }


    // Upload file to S3 bucket
    Lib.Debug.timingAuditLog('Start', 'AWS S3 - Upload file', instance['time_ms']);
    instance.aws.s3.send( new PutObjectCommand(service_params) )

      .then(function(data){
        Lib.Debug.timingAuditLog('End', 'AWS S3 - Upload file', instance['time_ms']);

        // Upload Successful
        cb(true);

      })

      .catch(function(err){

        // Log error for research
        Lib.Debug.logErrorForResearch(
          err,
          'Cause: AWS S3' +
          '\ncmd: Upload File' +
          '\nparams: ' + JSON.stringify({
            'Bucket': service_params['Bucket'],
            'Key': service_params['Key'],
            'ContentType': service_params['ContentType']
          }) // Do not log file body
        );

        // Invoke Callback. In case of S3 error, return false and not error.
        cb(false);

      });

  },


  /********************************************************************
  Upload File to S3 Sync
  Automatically overwrite's the file if it already exist

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {Set[]} files - Files to be upload

  @return {Object} Promise
  *********************************************************************/
  uploadFiles: function(
    instance, cb,
    files
  ){

    // Initialize AWS service Object if not already Initialized
    _CloudStorage.initIfNot(instance);

    // Initialise
    var promises = [];


    // Upload file to S3 bucket
    Lib.Debug.timingAuditLog('Start', 'AWS S3 - Upload file', instance['time_ms']);

    // Upload Promises
    promises = files.map(function(file){

      // Service Params
      let service_params = {
        'Bucket': file['bucket'], // S3 Bucket in which file is to be uploaded
        'Key': file['file_key'], // New File name with path
        'Body': file['file_content'], // Direct file object from memory
        'ContentType': file['file_type'] // File content type
      };

      // Add Optional Parameters to above object
      // Access Permissions - private | public-read | public-read-write | authenticated-read | aws-exec-read | bucket-owner-read | bucket-owner-full-control
      if( !Lib.Utils.isNullOrUndefined(file['is_public']) && file['is_public'] ){ // If file is public, set access permission to 'public-read'
        service_params['ACL'] = 'public-read';
      }
      else{
        service_params['ACL'] = 'private';
      }

      // Return
      return instance.aws.s3.send( new PutObjectCommand(service_params) );

    });


    // Handle async response
    Promise.all(promises)
      .then(function(data){
        Lib.Debug.timingAuditLog('End', 'AWS S3 - Upload file', instance['time_ms']);

        // Upload Successful
        cb(true);

      })

      .catch(function(err){

        // Log error for research
        Lib.Debug.logErrorForResearch(
          err,
          'Cause: AWS S3' +
          '\ncmd: Upload File' +
          '\nparams: ' + JSON.stringify({
            'err': err
          }) // Do not log file body
        );

        // Invoke Callback. In case of S3 error, return false and not error.
        cb(false);

      });

  },


  /********************************************************************
  Get/Read File from AWS S3

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} bucket - S3 Bucket in which file is located
  @param {String} file_key - Full path to file

  @param {String} [output_as_string] - (Optional) Return file content as string instead of buffer

  @return Thru request Callback.

  @callback - Request Callback
  * Note - no error is returned, instead 'false' is returned in case of error
  * @callback {String} data - File content as string on success
  * @callback {Buffer[]} data - File content as buffer on success
  * @callback {Boolean} data - false if file not found or other error
  *********************************************************************/
  getFile: function(
    instance, cb,
    bucket, file_key,
    output_as_string = false
  ){

    // Initialize AWS service Object if not already Initialized
    _CloudStorage.initIfNot(instance);


    // Service Params
    var service_params = {
      'Bucket': bucket, // S3 Bucket in which file is located
      'Key': file_key // File name
    };


    // Read file from S3 bucket
    Lib.Debug.timingAuditLog('Start', 'AWS S3 - Read file', instance['time_ms']);
    instance.aws.s3.send( new GetObjectCommand(service_params) )

      .then(function(data){
        Lib.Debug.timingAuditLog('End', 'AWS S3 - Read file', instance['time_ms']);

        // Initialize an array to save the data chunks
        var chunks = [];


        // Add event listeners to the readable stream

        // Recieve data chunk
        data.Body.on('data', function(chunk){
          chunks.push(chunk);
        });

        // Recieved final data chunk
        data.Body.on('end', function(){

          // Combine the chunks
          let fileContentBuffer = Buffer.concat(chunks);

          // Return the file content as string or buffer
          if(output_as_string){
            cb( fileContentBuffer.toString() ); // Convert file content buffer to string and return
          }
          else{
            cb( fileContentBuffer ); // Return file content as buffer
          }

        });

      })

      .catch(function(err){

        // Log error for research (Only if other the file-not-found error)
        if( err.name != 'NoSuchKey' ){
          Lib.Debug.logErrorForResearch(
            err,
            'Cause: AWS S3' +
            '\ncmd: Get File' +
            '\nparams: ' + JSON.stringify(service_params)
          );
        }

        // Invoke Callback
        // In case of file doesnot exist, return false.
        // In case of S3 error, return false and not error.
        cb(false);

      });

  },


  /********************************************************************
  Delete Single File from AWS S3

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} bucket - S3 Bucket in which file is located
  @param {String} file_key - Full path to file

  @return Thru request Callback.

  @callback - Request Callback
  * Note - no error is returned, instead 'false' is returned in case of error
  * @callback {Boolean} is_success - true on successful delete (even if file didn't exist)
  * @callback {Boolean} is_success - false on unsuccessful delete or error
  *********************************************************************/
  deleteFile: function(
    instance, cb,
    bucket, file_key
  ){

    // Initialize AWS service Object if not already Initialized
    _CloudStorage.initIfNot(instance);

    // Service Params
    var service_params = {
      'Bucket':  bucket,    // S3 Bucket in which file is located
      'Key':    file_key  // File name
    };

    // Delete File from AWS S3 Bucket
    Lib.Debug.timingAuditLog('Start', 'AWS S3 - Delete file', instance['time_ms']);
    instance.aws.s3.send( new DeleteObjectCommand(service_params) )

      .then(function(data){
        Lib.Debug.timingAuditLog('End', 'AWS S3 - Delete file', instance['time_ms']);

        // Delete successful or file doesnot exist
        cb(true);

      })

      .catch(function(err){

        // Log error for research
        Lib.Debug.logErrorForResearch(
          err,
          'Cause: AWS S3' +
          '\ncmd: Delete File' +
          '\nparams: ' + JSON.stringify(service_params)
        );

        // Invoke Callback. In case of S3 error, return false and not error.
        cb(false);

      });

  },


  /********************************************************************
  Delete Multiple Files from AWS S3 (Within same bucket)

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} bucket - S3 Bucket in which files are located
  @param {String[]} files_keys - Array of Full path to files

  @return Thru request Callback.

  @callback - Request Callback
  * Note - no error is returned, instead 'false' is returned in case of error
  * @callback {Boolean} is_success - true on successful delete (even if file didn't exist)
  * @callback {Boolean} is_success - false on error
  *********************************************************************/
  deleteFiles: function(
    instance, cb,
    bucket, files_keys
  ){

    // Initialize AWS service Object if not already Initialized
    _CloudStorage.initIfNot(instance);


    // Convert files list array to AWS params format
    var n = files_keys.length;
    while(n--){
      files_keys[n] = { 'Key': files_keys[n] };
    }

    // Service Params
    var service_params = {
      'Bucket':  bucket,    // S3 Bucket in which file is located
      'Delete': {
        'Objects': files_keys // File names
      },
    };


    // Delete Files from AWS S3 Bucket
    Lib.Debug.timingAuditLog('Start', 'AWS S3 - Delete files', instance['time_ms']);
    instance.aws.s3.send( new DeleteObjectsCommand(service_params) )

      .then(function(data){
        Lib.Debug.timingAuditLog('End', 'AWS S3 - Delete files', instance['time_ms']);

        // Delete successful or file(s) doesnot exist
        cb(true);

      })

      .catch(function(err){

        // Log error for research
        Lib.Debug.logErrorForResearch(
          err,
          'Cause: AWS S3' +
          '\ncmd: Delete File(s)' +
          '\nparams: ' + JSON.stringify(service_params)
        );

        // Invoke Callback. In case of S3 error, return false and not error.
        cb(false);

      });

  },


  /********************************************************************
  Copy File between AWS S3 Buckets

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} source_bucket - S3 Bucket in which file is located
  @param {String} source_file_key - Full path to existing file
  @param {String} destination_bucket - S3 Bucket in which file is to be copied
  @param {String} destination_file_key - Full path and name of duplicate file
  @param {Boolean} [is_public] - (Optional) Whether duplicate file will be publically accessible. Default false - Private

  @return Thru request Callback.

  @callback - Request Callback
  * Note - no error is returned, instead 'false' is returned in case of error
  * @callback {String} response - Copy Successful or file doesn't exist
  * @callback {Boolean} response - false on error
  *********************************************************************/
  copyFile: function(
    instance, cb,
    source_bucket, source_file_key, destination_bucket, destination_file_key,
    is_public
  ){

    // Initialize AWS service Object if not already Initialized
    _CloudStorage.initIfNot(instance);


    // Service Params
    var service_params = {
      'CopySource': source_bucket + '/' + source_file_key, // The name of the source bucket and key name of the source object, separated by a slash (/)
      'Bucket': destination_bucket, // Destination Bucket
      'Key': destination_file_key // Destination File name
    };

    // Add Optional Parameters to above object
    // Access Permissions - private | public-read | public-read-write | authenticated-read | aws-exec-read | bucket-owner-read | bucket-owner-full-control
    if( !Lib.Utils.isNullOrUndefined(is_public) && is_public ){ // If file is public, set access permission to 'public-read'
      service_params['ACL'] = 'public-read';
    }
    else{
      service_params['ACL'] = 'private';
    }


    // Copy file from S3 bucket to another
    Lib.Debug.timingAuditLog('Start', 'AWS S3 - Copy file', instance['time_ms']);
    instance.aws.s3.send( new CopyObjectCommand(service_params) )

      .then(function(response){
        Lib.Debug.timingAuditLog('End', 'AWS S3 - Copy file', instance['time_ms']);

        // Return true for sucess
        cb(true);

      })

      .catch(function(err){

        // Log error for research (Only if other the file-not-found error)
        if( err.name != 'NoSuchKey' ){
          Lib.Debug.logErrorForResearch(
            err,
            'Cause: AWS S3' +
            '\ncmd: Copy File' +
            '\nparams: ' + JSON.stringify(service_params)
          );
        }

        // Invoke Callback
        // In case of file doesnot exist, return false.
        // In case of S3 error, return false and not error.
        cb(false);

      });

  },


  /********************************************************************
  Move File between AWS S3 bucket

  @param {reference} instance - Request Instance object reference
  @param {Function} cb - Callback function to be invoked once async execution of this function is finished

  @param {String} source_bucket - S3 Bucket in which file is located
  @param {String} source_file_key - Full path to existing file
  @param {String} destination_bucket - S3 Bucket in which file is to be copied
  @param {String} destination_file_key - Full path and name of duplicate file
  @param {Boolean} [is_public] - (Optional) Whether duplicate file will be publically accessible. Default false - Private

  @return Thru request Callback.

  @callback - Request Callback
  * Note - no error is returned, instead 'false' is returned in case of error
  * @callback {String} response - Move Successful or file doesn't exist
  * @callback {Boolean} response - false on error
  *********************************************************************/
  moveFile: function(
    instance, cb,
    source_bucket, source_file_key, destination_bucket, destination_file_key,
    is_public
  ){

    CloudStorage.copyFile(
      instance,
      function(copy_success){  // Callback

        if(!copy_success){
          return cb(false); // File not found
        }

        // Reach here means all good. Now, delete source file from S3

        // Delete source file from S3
        CloudStorage.deleteFile(
          instance,
          function(delete_success){
            cb(true); // Don't care about deletion success in this case.
          },
          source_bucket, // Source S3 Bucket
          source_file_key, // Source File location
        ); // Close - S3-DeleteFile

      }, // Close - S3-Delete,
      source_bucket, // Source from S3 Bucket
      source_file_key, // Source from File location
      destination_bucket, // Move to S3 Bucket
      destination_file_key, // Move to File location
      is_public // Private or public Access
    ); // Close - S3-Copy

  },

};///////////////////////////Public Functions END//////////////////////////////



//////////////////////////Private Functions START//////////////////////////////
const _CloudStorage = { // Private functions accessible within this modules only

  /********************************************************************
  Initialize AWS S3 Service Object - Only if not already initialized

  @param {reference} instance - Request Instance object reference

  @return - None
  *********************************************************************/
  initIfNot: function(instance){

    // Create 'aws' object in instance if it's not already present
    if( !('aws' in instance) ){
      instance['aws'] = {};
    }


    // Initialize only if 's3' object is not already Initialized
    if( !Lib.Utils.isNullOrUndefined(instance.aws.s3) ){
      return; // Do not proceed since already initalized
    }


    Lib.Debug.timingAuditLog('Init-Start', 'AWS S3 Server Connection (cloudstorage)', instance['time_ms']);
    // Dependency - AWS SDK - S3 Services
    ({
      S3Client,
      ListObjectsCommand,
      GetObjectCommand, PutObjectCommand,
      DeleteObjectCommand, DeleteObjectsCommand,
      CopyObjectCommand
    } = require("@aws-sdk/client-s3"));

    // Initialize S3 object
    instance.aws.s3 = new S3Client({
      region: CONFIG.REGION,
      credentials: {
        accessKeyId: CONFIG.KEY,
        secretAccessKey: CONFIG.SECRET
      },
      maxAttempts: CONFIG.MAX_RETRIES,
      timeout: CONFIG.TIMEOUT,
      logger: Lib.Debug, // Write debug information to Lib.Debug.log() instead of console.log()
      apiVersion: '2006-03-01' // or use 'latest'
    });
    Lib.Debug.timingAuditLog('Init-End', 'AWS S3 Server Connection (cloudstorage)', instance['time_ms']);

  },

};//////////////////////////Private Functions END//////////////////////////////
