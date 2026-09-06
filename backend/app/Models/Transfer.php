<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transfer extends Model
{
    protected $fillable = ['source_account_id', 'destination_account_id', 'amount', 'date', 'description'];

    protected function casts(): array
    {
        return ['amount' => 'integer', 'date' => 'immutable_date'];
    }

    public function sourceAccount()
    {
        return $this->belongsTo(Account::class, 'source_account_id');
    }

    public function destinationAccount()
    {
        return $this->belongsTo(Account::class, 'destination_account_id');
    }
}
