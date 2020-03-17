<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:api')->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('/areas', function(Request $request) {
	$query = DB::table('areas');
	if($request->type == 'list') {
		$query->groupBy('street', 'postcode');
	}
    return response()->json($query->get());
});

Route::post('/areas', function(Request $request) {
    try {
        $request->validate([
            'street' => 'required',
            'postcode' => 'required',
            'coordinates' => 'required'
        ]);
        $id = DB::table('areas')->insertGetId([
            'street' => $request->street,
            'postcode' => $request->postcode,
            'name' => $request->name,
            'coordinates' => $request->coordinates,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ]);
        return response()->json(compact('id'));
    } catch(Exception $error) {
        return response()->json(['message' => $error->getMessage()]);
    }
});
