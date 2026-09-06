<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => $request->user()->categories()->orderBy('type')->orderBy('name')->orderBy('id')->get()]);
    }

    public function show(Request $request, string $category)
    {
        return response()->json(['data' => $request->user()->categories()->findOrFail($category)]);
    }

    public function store(Request $request)
    {
        return $this->save($request);
    }

    public function update(Request $request, string $category)
    {
        return $this->save($request, $request->user()->categories()->findOrFail($category));
    }

    public function destroy(Request $request, string $category)
    {
        $category = $request->user()->categories()->findOrFail($category);
        if ($category->transactions()->exists()) {
            throw ValidationException::withMessages(['category' => 'This category is used by existing activity and cannot be deleted.']);
        }
        $category->delete();

        return response()->noContent();
    }

    private function save(Request $request, ?Category $category = null)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::in(['income', 'expense'])],
        ]);
        $data['name_key'] = mb_strtolower($data['name']);
        if ($category && $category->type !== $data['type'] && $category->transactions()->exists()) {
            throw ValidationException::withMessages(['type' => 'A category used by existing activity cannot change type.']);
        }
        $duplicate = $request->user()->categories()->where('type', $data['type'])->where('name_key', $data['name_key']);
        if ($category) {
            $duplicate->whereKeyNot($category->id);
        }
        if ($duplicate->exists()) {
            throw ValidationException::withMessages(['name' => 'A category with this name and type already exists.']);
        }
        try {
            if ($category) {
                $category->update($data);
            } else {
                $category = $request->user()->categories()->create($data);
            }
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['name' => 'A category with this name and type already exists.']);
        }

        return response()->json(['data' => $category], $category->wasRecentlyCreated ? 201 : 200);
    }
}
