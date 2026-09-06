<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecurringRule extends Model
{
    protected $fillable = ['account_id', 'category_id', 'type', 'amount', 'description', 'notes', 'frequency', 'start_date', 'next_execution_date', 'end_date', 'is_active'];

    protected function casts(): array
    {
        return ['amount' => 'integer', 'is_active' => 'boolean'];
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
