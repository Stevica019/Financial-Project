<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Budget extends Model
{
    protected $fillable = ['category_id', 'amount', 'month'];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
