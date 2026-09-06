<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $fillable = ['name', 'type', 'opening_balance', 'opening_date', 'description', 'is_active'];

    protected function casts(): array
    {
        return ['opening_balance' => 'integer', 'opening_date' => 'immutable_date', 'is_active' => 'boolean'];
    }
}
