<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $fillable = ['name', 'type', 'opening_balance', 'opening_date', 'description', 'is_active'];

    public function recurringRules()
    {
        return $this->hasMany(RecurringRule::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function transfers()
    {
        return Transfer::query()->where(fn ($query) => $query->where('source_account_id', $this->id)->orWhere('destination_account_id', $this->id));
    }

    protected function casts(): array
    {
        return ['opening_balance' => 'integer', 'opening_date' => 'immutable_date', 'is_active' => 'boolean'];
    }
}
